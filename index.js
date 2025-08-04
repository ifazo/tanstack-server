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
  console.log(`Tanstack Server listening on port ${port}`);
});

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5000" },
});

const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join_chat", (userData) => {
    const { userId, userName, userEmail } = userData;
    connectedUsers.set(socket.id, {
      userId,
      userName,
      userEmail,
      socketId: socket.id,
    });

    console.log(`${userName} joined the chat`);

    socket.broadcast.emit("user_joined", {
      userName,
      message: `${userName} joined the chat`,
      timestamp: new Date(),
    });

    const onlineUsers = Array.from(connectedUsers.values());
    socket.emit("online_users", onlineUsers);

    io.emit("update_online_users", onlineUsers);
  });

  socket.on("send_message", (messageData) => {
    const { message, userName, userEmail, timestamp } = messageData;
    const user = connectedUsers.get(socket.id);

    if (user) {
      const chatMessage = {
        id: Date.now() + Math.random(),
        message,
        userName: userName,
        userEmail: userEmail,
        timestamp: timestamp || new Date(),
        socketId: socket.id,
      };

      io.emit("receive_message", chatMessage);
      console.log(`Message from ${userName}: ${message}`);
    }
  });

  socket.on("typing", (typingData) => {
    const { userName, isTyping } = typingData;
    socket.broadcast.emit("user_typing", {
      userName,
      isTyping,
      socketId: socket.id,
    });
  });

  socket.on("join_room", (roomData) => {
    const { roomId, userName } = roomData;
    socket.join(roomId);

    socket.to(roomId).emit("user_joined_room", {
      userName,
      roomId,
      message: `${userName} joined room ${roomId}`,
      timestamp: new Date(),
    });

    console.log(`${userName} joined room: ${roomId}`);
  });

  socket.on("leave_room", (roomData) => {
    const { roomId, userName } = roomData;
    socket.leave(roomId);

    socket.to(roomId).emit("user_left_room", {
      userName,
      roomId,
      message: `${userName} left room ${roomId}`,
      timestamp: new Date(),
    });

    console.log(`${userName} left room: ${roomId}`);
  });

  socket.on("send_room_message", (messageData) => {
    const { roomId, message, userName, userEmail, timestamp } = messageData;
    const user = connectedUsers.get(socket.id);

    if (user) {
      const chatMessage = {
        id: Date.now() + Math.random(),
        message,
        userName: userName,
        userEmail: userEmail,
        roomId,
        timestamp: timestamp || new Date(),
        socketId: socket.id,
      };

      io.to(roomId).emit("receive_room_message", chatMessage);
      console.log(`Room message from ${userName} in ${roomId}: ${message}`);
    }
  });

  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`${user.userName} disconnected`);

      connectedUsers.delete(socket.id);

      socket.broadcast.emit("user_left", {
        userName: user.userName,
        message: `${user.userName} left the chat`,
        timestamp: new Date(),
      });

      const onlineUsers = Array.from(connectedUsers.values());
      io.emit("update_online_users", onlineUsers);
    } else {
      console.log("A user disconnected:", socket.id);
    }
  });
});

async function run() {
  const db = client.db(process.env.MONGODB_DB);
  const userCollection = db.collection("users");
  const postCollection = db.collection("posts");
  const chatCollection = db.collection("chats");

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

  app.get("/api/users", authMiddleware, async (_req, res, next) => {
    try {
      const users = await userCollection.find().toArray();
      res.status(200).send(users);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:id", authMiddleware, async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await userCollection.findOne({ _id: new ObjectId(id) });
      res.status(200).send(user);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:id", authMiddleware, async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = req.body;
      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: user }
      );
      if (!result.acknowledged) {
        return res.status(400).send({
          success: false,
          error: "User not updated",
        });
      }
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/users/:id", authMiddleware, async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await userCollection.deleteOne({
        _id: new ObjectId(id),
      });
      if (!result.acknowledged) {
        return res.status(400).send({
          success: false,
          error: "User not deleted",
        });
      }
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/chats/:userId", async (req, res, next) => {
    try {
      const { userId } = req.params;
      const chats = await chatCollection.find({ userId }).toArray();
      res.status(200).send(chats);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chats", async (req, res, next) => {
    try {
      const chat = req.body;
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

  app.patch("/api/chats/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      const chat = req.body;
      const result = await chatCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: chat }
      );
      if (!result.acknowledged) {
        return res.status(400).send({
          success: false,
          error: "Chat not updated",
        });
      }
      res.status(200).send(result);
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
      const token = req.headers.authorization?.split(" ")[1];
      const JWTtoken = process.env.JWT_SECRET_TOKEN;
      const decodedToken = jwt.verify(token, JWTtoken);
      const { role } = decodedToken;
      if (role !== "admin") {
        return res.status(403).send({
          success: false,
          error: "Unauthorized access",
        });
      }
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
      const post = req.body;
      const { id } = req.params;
      const token = req.headers.authorization?.split(" ")[1];
      const JWTtoken = process.env.JWT_SECRET_TOKEN;
      const decodedToken = jwt.verify(token, JWTtoken);
      const { role } = decodedToken;
      if (role !== "admin") {
        return res.status(403).send({
          success: false,
          error: "Unauthorized access",
        });
      }
      const result = await postCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: post }
      );
      if (!result.acknowledged) {
        return res.status(400).send({
          success: false,
          error: "Post not updated",
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
      const { role } = decodedToken;
      if (role !== "admin") {
        return res.status(403).send({
          success: false,
          error: "Unauthorized access",
        });
      }
      const result = await postCollection.deleteOne({
        _id: new ObjectId(id),
      });
      if (!result.acknowledged) {
        return res.status(400).send({
          success: false,
          error: "Post not deleted",
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
      const { comment, userName, userEmail } = req.body;
      if (!comment || !userName || !userEmail) {
        return res.status(400).send({
          success: false,
          error: "All fields are required: comment, userName, userEmail.",
        });
      }
      const newComment = {
        comment,
        userName,
        userEmail,
        date: new Date(),
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
      const { comment, userEmail } = req.body;
      if (!userEmail || !comment) {
        return res.status(400).send({
          success: false,
          error: "Missing required fields: userEmail and comment.",
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
      const findComment = post.comments?.find(
        (rev) => rev.userEmail === userEmail
      );
      if (!findComment) {
        return res.status(404).send({ success: false,error: "Comment not found." });
      }
      const updateFields = {};
      if (comment) updateFields["comments.$[comment].comment"] = comment;
      const result = await postCollection.updateOne(
        { _id: new ObjectId(postId) },
        { $set: updateFields },
        {
          arrayFilters: [{ "comment.userEmail": userEmail }],
        }
      );
      if (!result.acknowledged) {
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
      const { userEmail } = req.body;

      if (!userEmail) {
        return res.status(400).send({ success: false, error: "Missing userEmail." });
      }

      const post = await postCollection.findOne({
        _id: new ObjectId(postId),
      });
      if (!post) {
        return res.status(404).send({ success: false, error: "post not found." });
      }
      const commentIndex = post.comments?.findIndex(
        (rev) => rev.userEmail === userEmail
      );
      if (commentIndex === -1) {
        return res.status(404).send({ success: false, error: "comment not found." });
      }
      const result = await postCollection.updateOne(
        { _id: new ObjectId(postId) },
        { $pull: { comments: { userEmail: userEmail } } }
      );
      if (!result.acknowledged) {
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
}

run().catch(console.dir);
