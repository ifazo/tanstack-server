import process from "node:process";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Server } from "socket.io";

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const port = process.env.PORT;
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .send({ success: false, error: "Unauthorized access" });
    }
    const secret = process.env.JWT_SECRET_TOKEN;
    jwt.verify(token, secret);
    next();
  } catch (error) {
    return res.status(401).send({ success: false, error: error.message });
  }
};

const server = app.listen(port, () => {
  console.log(`✅ Tanstack Server listening on port ${port}`);
});

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5000" },
});

const connectedUsers = new Map();

//! We'll initialize this inside the run function to access the database
let chatCollection;
let groupCollection;

io.on("connection", (socket) => {
  console.log(`[SOCKET CONNECTED] ${socket.id}`);

  //! Handle socket connection errors
  socket.on("error", (error) => {
    console.error(`[SOCKET ERROR] ${socket.id}:`, error);
  });

  //! Store connected user info
  socket.on("join_chat", (userData) => {
    try {
      const { userId, userName, userEmail } = userData;
      if (!userId || !userName || !userEmail) return;

      connectedUsers.set(socket.id, {
        userId,
        userName,
        userEmail,
        socketId: socket.id,
      });
      console.log(`[JOINED] ${userName}`);

      const onlineUsers = Array.from(connectedUsers.values());

      socket.emit("online_users", onlineUsers);
      socket.broadcast.emit("user_joined", {
        userName,
        message: `${userName} joined the chat`,
        timestamp: new Date(),
      });
      io.emit("update_online_users", onlineUsers);
    } catch (error) {
      console.error("Error in join_chat:", error);
      socket.emit("error", { message: "Failed to join chat" });
    }
  });
  //! Message to personal chat
  socket.on("send_message", async ({ message, userName, userEmail }) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user || !message) return;

      const now = new Date();

      const existingChat = await chatCollection.findOne({
        userId: user.userId,
      });

      const newMsg = { text: message, timestamp: now };

      if (existingChat) {
        await chatCollection.updateOne(
          { _id: existingChat._id },
          {
            $push: { messages: newMsg },
            $set: { lastUpdated: now },
          }
        );
      } else {
        await chatCollection.insertOne({
          userId: user.userId,
          userName,
          userEmail,
          messages: [newMsg],
          lastUpdated: now,
        });
      }

      io.to(socket.id).emit("receive_message", {
        userId: user.userId,
        message: newMsg,
      });
    } catch (error) {
      console.error("Error in send_message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  //! Group join/leave
  socket.on("join_group", async ({ groupId, userName }) => {
    if (!groupId || !userName) return;

    const user = connectedUsers.get(socket.id);
    if (!user) return;

    socket.join(groupId);

    try {
      //! Check if group exists
      let group = await groupCollection.findOne({ groupId });

      if (!group) {
        console.log(`Group ${groupId} not found`);
        return
      }
      //! Add user to group members if not already present
      const isMember = group.members.some(
        (member) => member.userId === user.userId
      );
      if (!isMember) {
        await groupCollection.updateOne(
          { groupId },
          {
            $push: {
              members: {
                userId: user.userId,
                userName: user.userName,
                userEmail: user.userEmail,
                joinedAt: new Date(),
              },
            },
          }
        );
        console.log(`${userName} added to group ${groupId} members`);
      }
    } catch (error) {
      console.error("Error joining group:", error);
    }

    socket.to(groupId).emit("user_joined_group", {
      userName,
      groupId,
      message: `${userName} joined group ${groupId}`,
      joinedAt: new Date(),
    });

    console.log(`[GROUP JOINED] ${userName} -> ${groupId}`);
  });

  socket.on("leave_group", async ({ groupId, userName }) => {
    if (!groupId || !userName) return;

    const user = connectedUsers.get(socket.id);
    socket.leave(groupId);

    try {
      if (user && groupCollection) {
        const leaveMessage = {
          id: Date.now() + Math.random(),
          message: `${userName} left the group`,
          userName: "System",
          userEmail: "system@chat.com",
          userId: "system",
          groupId,
          leavedAt: new Date(),
        };

        await groupCollection.updateOne(
          { groupId },
          { $push: { messages: leaveMessage } }
        );
      }
    } catch (error) {
      console.error("Error leaving group:", error);
    }

    socket.to(groupId).emit("user_left_group", {
      userName,
      groupId,
      message: `${userName} left group ${groupId}`,
      leavedAt: new Date(),
    });

    console.log(`[GROUP LEFT] ${userName} -> ${groupId}`);
  });

  // Group messages
  socket.on("send_group_message", async ({ groupId, message }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !message) return;

    try {
      const chatMessage = {
        id: Date.now() + Math.random(),
        groupId,
        message,
        userId: user.userId,
        userName: user.userName,
        userEmail: user.userEmail,
        timestamp: new Date(),
      };

      // Save to chatCollection for API consistency
      // await chatCollection.insertOne(chatMessage);

      // Also save to group collection
      await groupCollection.updateOne(
        { groupId },
        {
          $push: { messages: chatMessage },
          $set: { lastUpdated: new Date() },
        }
      );

      console.log(`Group message saved from ${userName} in ${groupId}`);

      io.to(groupId).emit("receive_group_message", chatMessage);
    } catch (error) {
      console.error("Error saving group message:", error);
    }
  });

  socket.on("typing", ({ userName, isTyping }) => {
    socket.broadcast.emit("user_typing", {
      userName,
      isTyping,
      socketId: socket.id,
    });
  });

  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`[DISCONNECTED] ${user.userName}`);
      connectedUsers.delete(socket.id);

      socket.broadcast.emit("user_left", {
        userName: user.userName,
        message: `${user.userName} left the chat`,
        timestamp: new Date(),
      });

      const onlineUsers = Array.from(connectedUsers.values());
      io.emit("update_online_users", onlineUsers);
    } else {
      console.log(`[DISCONNECTED] Unknown socket: ${socket.id}`);
    }
  });
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    console.log("🔄 Retrying in 5 seconds...");
    setTimeout(() => {
      run().catch(console.error);
    }, 5000);
  }

  const db = client.db(process.env.MONGODB_DB);
  const userCollection = db.collection("users");
  const postCollection = db.collection("posts");
  chatCollection = db.collection("chats");
  groupCollection = db.collection("groups");

  app.get("/", (_req, res) => {
    res.status(200).send("Welcome to Tanstack Server!");
  });

  app.get("/api", (_req, res) => {
    res.status(200).send({ message: "Tanstack Server api is running!" });
  });

  app.post("/api/token", async (req, res, next) => {
    try {
      const data = req.body;
      const user = await userCollection.findOne({ email: data.email });
      if (!user) {
        return res.status(400).send({
          success: false,
          error: "User does not exist",
        });
      }
      const payload = {
        id: user._id,
        name: user.name,
        email: user.email,
      };
      const JWToken = process.env.JWT_SECRET_TOKEN;
      const token = jwt.sign(payload, JWToken);
      res.status(200).send({ token });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth", async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(400).send({
          success: false,
          error: "User does not exist",
        });
      }
      const isPasswordCorrect = await bcrypt.compare(password, user?.password);
      if (!isPasswordCorrect) {
        return res.status(400).send({
          success: false,
          error: "Password is incorrect",
        });
      }
      const payload = {
        _id: user._id,
        name: user.name,
        email: user.email,
      };
      const JWTtoken = process.env.JWT_SECRET_TOKEN;
      const token = jwt.sign(payload, JWTtoken);
      res.status(200).send({ token });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/users", async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      const existingUser = await userCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).send({
          success: false,
          error: "User already exists",
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = { name, email, password: hashedPassword };
      user.createdAt = new Date();
      const createUser = await userCollection.insertOne(user);
      if (!createUser.acknowledged) {
        return res.status(400).send({
          success: false,
          error: "User not created",
        });
      }
      res.status(201).send(createUser);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users", async (_req, res, next) => {
    try {
      const users = await userCollection.find().toArray();
      res.status(200).send(users);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await userCollection.findOne({ _id: new ObjectId(id) });
      if (!user) {
        return res.status(404).send({
          success: false,
          error: "User not found",
        });
      }
      res.status(200).send(user);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = req.body;
      user.updatedAt = new Date();
      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: user }
      );
      if (result.modifiedCount === 0) {
        return res.status(400).send({
          success: false,
          error: "User not found or updated",
        });
      }
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/users/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await userCollection.deleteOne({
        _id: new ObjectId(id),
      });
      if (result.deletedCount === 0) {
        return res.status(400).send({
          success: false,
          error: "User not found or deleted",
        });
      }
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chats", async (req, res, next) => {
    try {
      const chat = req.body;
      chat.createdAt = new Date();
      const result = await chatCollection.insertOne(chat);
      if (!result.acknowledged) {
        return res.status(400).send({
          success: false,
          error: "Chat not created",
        });
      }
      res.status(201).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/chats/personal/:userId", async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { limit = 50, skip = 0 } = req.query;
      const chats = await chatCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .toArray();
      res.status(200).send(chats.reverse());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/chats/group/:groupId", async (req, res, next) => {
    try {
      const { groupId } = req.params;
      const { limit = 50, skip = 0 } = req.query;
      const chats = await chatCollection
        .find({ groupId })
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .toArray();
      res.status(200).send(chats.reverse());
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/chats/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      const chat = req.body;
      chat.updatedAt = new Date();
      const result = await chatCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: chat }
      );
      if (result.modifiedCount === 0) {
        return res.status(400).send({
          success: false,
          error: "Chat not found or updated",
        });
      }
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/chats/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await chatCollection.deleteOne({
        _id: new ObjectId(id),
      });
      if (result.deletedCount === 0) {
        return res.status(400).send({
          success: false,
          error: "Chat not found or deleted",
        });
      }
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/groups", async (req, res, next) => {
    try {
      const { name, createdBy } = req.body;

      if (!name || !createdBy) {
        return res.status(400).send({
          success: false,
          error: "name and createdBy are required",
        });
      }

      const group = {
        name,
        createdBy,
        createdAt: new Date(),
        members: [],
        messages: [],
      };

      const result = await groupCollection.insertOne(group);
      if (!result.acknowledged) {
        return res.status(400).send({
          success: false,
          error: "Group not created",
        });
      }
      res.status(201).send(group);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/groups", async (req, res, next) => {
    try {
      const groups = await groupCollection.find({}).toArray();
      res.status(200).send(groups);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/groups/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      const { member, messages } = req.query;
      const group = await groupCollection.findOne({ _id: new ObjectId(id) });
      if (!group) {
        return res.status(404).send({
          success: false,
          error: "Group not found",
        });
      }
      if (member) {
        return res.status(200).send(group.members || []);
      }
      if (messages) {
        return res.status(200).send(group.messages || []);
      }
      res.status(200).send(group);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/posts", async (req, res, next) => {
    try {
      const { search, skip, limit, sort, sortBy } = req.query;
      let query = {};

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      const totalPosts = await postCollection.countDocuments(query);
      let cursor = postCollection.find(query);

      cursor = cursor.skip(parseInt(skip)).limit(parseInt(limit));

      if (sortBy && sort) {
        const sortDirection = sort === "asc" ? 1 : -1;
        const sortFields = { [sortBy]: sortDirection };
        cursor = cursor.sort(sortFields);
      }

      const posts = await cursor.toArray();

      res.status(200).send({ totalPosts, posts });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/posts/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      const post = await postCollection.findOne({
        _id: new ObjectId(id),
      });
      res.status(200).send(post);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/posts", authMiddleware, async (req, res, next) => {
    try {
      const post = req.body;
      post.createdAt = new Date();
      const result = await postCollection.insertOne(post);
      if (!result.acknowledged) {
        return res.status(400).send({
          success: false,
          error: "Post not created",
        });
      }
      res.status(201).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/posts/:id", authMiddleware, async (req, res, next) => {
    try {
      const { id } = req.params;
      const post = req.body;
      const token = req.headers.authorization?.split(" ")[1];
      const JWTtoken = process.env.JWT_SECRET_TOKEN;
      const decodedToken = jwt.verify(token, JWTtoken);
      const { _id } = decodedToken;
      const findPost = await postCollection.findOne({
        _id: new ObjectId(id),
      });
      if (findPost.userId !== _id) {
        return res.status(403).send({
          success: false,
          error: "Unauthorized access",
        });
      }
      const result = await postCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: post }
      );
      if (result.modifiedCount === 0) {
        return res.status(400).send({
          success: false,
          error: "Post not found or updated",
        });
      }
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/posts/:id", authMiddleware, async (req, res, next) => {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.split(" ")[1];
      const JWTtoken = process.env.JWT_SECRET_TOKEN;
      const decodedToken = jwt.verify(token, JWTtoken);
      const { _id } = decodedToken;
      const findPost = await postCollection.findOne({
        _id: new ObjectId(id),
      });
      if (findPost.userId !== _id) {
        return res.status(403).send({
          success: false,
          error: "Unauthorized access",
        });
      }
      const result = await postCollection.deleteOne({
        _id: new ObjectId(id),
      });
      if (result.deletedCount === 0) {
        return res.status(400).send({
          success: false,
          error: "Post not found or deleted",
        });
      }
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/comments/:postId", async (req, res, next) => {
    try {
      const { postId } = req.params;
      const post = await postCollection.findOne({
        _id: new ObjectId(postId),
      });
      if (!post) {
        return res
          .status(404)
          .send({ success: false, error: "post not found." });
      }
      const comments = post.comments || [];
      res.status(200).send(comments);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/comments/:postId", async (req, res, next) => {
    try {
      const { postId } = req.params;
      const { comment, userId, userName, userEmail } = req.body;
      if (!comment || !userId || !userName || !userEmail) {
        return res.status(400).send({
          success: false,
          error:
            "All fields are required: comment, userId, userName, userEmail.",
        });
      }
      const newComment = {
        comment,
        userId,
        userName,
        userEmail,
        createdAt: new Date(),
      };
      const result = await postCollection.updateOne(
        { _id: new ObjectId(postId) },
        { $push: { comments: newComment } }
      );
      if (!result.acknowledged) {
        return res.status(404).send({
          success: false,
          error: "Post not found or comment not added.",
        });
      }
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/comments/:postId", async (req, res, next) => {
    try {
      const { postId } = req.params;
      const { comment, userId } = req.body;
      if (!userId || !comment) {
        return res.status(400).send({
          success: false,
          error: "Missing required fields: userId and comment.",
        });
      }
      const post = await postCollection.findOne({
        _id: new ObjectId(postId),
      });
      if (!post) {
        return res
          .status(404)
          .send({ success: false, error: "post not found." });
      }
      const findComment = post.comments?.find((rev) => rev.userId === userId);
      if (!findComment) {
        return res
          .status(404)
          .send({ success: false, error: "Comment not found." });
      }
      const updateFields = {};
      if (comment) updateFields["comments.$[comment].comment"] = comment;
      const result = await postCollection.updateOne(
        { _id: new ObjectId(postId) },
        { $set: updateFields },
        {
          arrayFilters: [{ "comment.userId": userId }],
        }
      );
      if (result.modifiedCount === 0) {
        return res.status(404).send({
          success: false,
          error: "Failed to update comment.",
        });
      }
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/comments/:postId", async (req, res, next) => {
    try {
      const { postId } = req.params;
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).send({ success: false, error: "Missing user." });
      }
      const post = await postCollection.findOne({
        _id: new ObjectId(postId),
      });
      if (!post) {
        return res
          .status(404)
          .send({ success: false, error: "post not found." });
      }
      const commentIndex = post.comments?.findIndex(
        (rev) => rev.userEmail === userEmail
      );
      if (commentIndex === -1) {
        return res
          .status(404)
          .send({ success: false, error: "comment not found." });
      }
      const result = await postCollection.updateOne(
        { _id: new ObjectId(postId) },
        { $pull: { comments: { userEmail: userEmail } } }
      );
      if (result.deletedCount === 0) {
        return res.status(404).send({
          success: false,
          error: "Failed to delete comment.",
        });
      }
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.use((_req, res, error) => {
    console.error("❌ Server Error:", error.message || error);
    res.status(error.status || 500).send({
      success: false,
      error:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : error.message || "Internal Server Error",
    });
  });
}

run().catch((error) => {
  console.error("❌ Failed to start server:", error);
  console.log("🔄 Retrying in 5 seconds...");
  setTimeout(() => {
    run().catch(console.error);
  }, 5000);
});
