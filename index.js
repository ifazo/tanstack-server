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
      return res.status(401).json({ message: "Unauthorized access" });
    }
    const secret = process.env.JWT_SECRET_TOKEN;
    jwt.verify(token, secret);
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};

const ownerMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token found" });
    }
    const secret = process.env.JWT_SECRET_TOKEN;
    const decodedToken = jwt.verify(token, secret);

    req.user = {
      _id: decodedToken._id,
      name: decodedToken.name,
      email: decodedToken.email,
    };

    const userId = req.body?.userId || req.params?.userId || req.query?.userId;

    if (userId && req.user._id !== userId) {
      return res.status(403).json({
        message: "Forbidden: You're not the owner",
      });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};

const server = app.listen(port, () => {
  console.log(`✅ Tanstack Server listening on port ${port}`);
});

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5000" },
});

const connectedUsers = new Map();

let chatCollection;
let groupCollection;

io.on("connection", (socket) => {
  console.log(`[SOCKET CONNECTED] ${socket.id}`);

  socket.on("error", (error) => {
    console.error(`[SOCKET ERROR] ${socket.id}:`, error);
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
  const db = client.db(process.env.MONGODB_DB);
  const userCollection = db.collection("users");
  const postCollection = db.collection("posts");
  chatCollection = db.collection("chats");
  groupCollection = db.collection("groups");

  app.get("/", (_req, res) => {
    res.status(200).send("Welcome to Tanstack Server!");
  });

  app.get("/api", (_req, res) => {
    res.status(200).json({ message: "Tanstack Server api is running!" });
  });

  app.post("/api/token", async (req, res) => {
    try {
      const data = req.body;
      const user = await userCollection.findOne({ email: data.email });
      if (!user) {
        return res.status(400).json({
          message: "User does not exist",
        });
      }
      const payload = {
        id: user._id,
        name: user.name,
        email: user.email,
      };
      const JWToken = process.env.JWT_SECRET_TOKEN;
      const token = jwt.sign(payload, JWToken);
      res.status(200).json({ token });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth", async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required",
        });
      }

      const user = await userCollection.findOne({ email });

      if (password === "social") {
        if (!user) {
          const addSocialUser = await userCollection.insertOne({
            name: name || "Social User",
            email: email,
            password: "social",
            createdAt: new Date(),
          });

          const payload = {
            _id: addSocialUser.insertedId,
            name: name || "Social User",
            email: email,
          };

          const JWTtoken = process.env.JWT_SECRET_TOKEN;
          const token = jwt.sign(payload, JWTtoken);

          return res.status(200).json({
            token,
            user: payload,
            message: "Social user created successfully",
          });
        } else {
          const payload = {
            _id: user._id,
            name: user.name,
            email: user.email,
          };

          const JWTtoken = process.env.JWT_SECRET_TOKEN;
          const token = jwt.sign(payload, JWTtoken);

          return res.status(200).json({
            token,
            user: payload,
            message: "Social login successful",
          });
        }
      }

      if (!user) {
        return res.status(404).json({
          message: "User not found. Please sign up first.",
        });
      }

      if (user.password === "social") {
        return res.status(400).json({
          message:
            "This account was created using social login. Please use Google or GitHub to sign in.",
        });
      }

      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(401).json({
          message: "Invalid password",
        });
      }

      const payload = {
        _id: user._id,
        name: user.name,
        email: user.email,
      };

      const JWTtoken = process.env.JWT_SECRET_TOKEN;
      const token = jwt.sign(payload, JWTtoken);

      res.status(200).json({
        token,
        user: payload,
        message: "Login successful",
      });
    } catch (error) {
      console.error("Auth error:", error);
      next(error);
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      const existingUser = await userCollection.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          message: "User already exists",
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = { name, email, password: hashedPassword };
      user.createdAt = new Date();
      const createUser = await userCollection.insertOne(user);
      if (!createUser.acknowledged) {
        return res.status(400).json({
          message: "User not created",
        });
      }
      const payload = {
        _id: createUser.insertedId,
        name: user.name,
        email: user.email,
      };
      const JWTtoken = process.env.JWT_SECRET_TOKEN;
      const token = jwt.sign(payload, JWTtoken);
      res.status(201).json({ token, user: payload });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users", async (_req, res) => {
    try {
      const users = await userCollection.find().toArray();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await userCollection.findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:userId", ownerMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = req.body;
      user.updatedAt = new Date();
      const result = await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: user }
      );
      if (result.modifiedCount === 0) {
        return res.status(400).json({
          message: "User not found or updated",
        });
      }
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/users/:userId", ownerMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await userCollection.deleteOne({
        _id: new ObjectId(userId),
      });
      if (result.deletedCount === 0) {
        return res.status(400).json({
          message: "User not found or deleted",
        });
      }
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  // app.post("/api/chats", async (req, res) => {
  //   try {
  //     const chat = req.body;
  //     // chat.createdAt = new Date();
  //     const result = await chatCollection.insertOne(chat);
  //     if (!result.acknowledged) {
  //       return res.status(400).json({
  //         message: "Chat not created",
  //       });
  //     }
  //     res.status(201).json(result);
  //   } catch (error) {
  //     next(error);
  //   }
  // });
  //! Get all personal chats overview list for a user
  app.get("/api/chats/personal/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { receiverId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      const userChat = await chatCollection.findOne({ userId });
      if (!userChat) {
        return res.status(200).json({ conversation: [] });
      }
      if (receiverId) {
        const conversation = userChat.conversations?.find(
          (conv) => conv.receiverId === receiverId
        );
        if (!conversation) {
          return res.status(200).json({ messages: [] });
        }

        const messages = conversation.messages || [];

        return res.status(200).json({
          receiverId: conversation.receiverId,
          messages: messages,
          totalMessages: messages.length,
        });
      }

      const conversationsOverview =
        userChat.conversations?.map((conv) => ({
          receiverId: conv.receiverId,
          lastMessage: conv.messages[conv.messages.length - 1],
          messageCount: conv.messages.length,
          lastUpdated: conv.lastUpdated,
        })) || [];

      res.status(200).json({
        conversations: conversationsOverview,
        totalConversations: conversationsOverview.length,
      });
    } catch (error) {
      next(error);
    }
  });
  //! Get a specific group chat by groupId
  app.get("/api/chats/group/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
      const group = await groupCollection.findOne({ groupId });
      if (!group) {
        return res.status(404).json({
          message: "Group not found",
        });
      }
      const messages = group.messages || [];
      messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      res.status(200).json({
        groupId: group.groupId,
        groupName: group.groupName || null,
        totalMessages: messages.length,
        messages,
      });
    } catch (error) {
      next(error);
    }
  });
  //! Update a specific conversation in user's chat
  app.patch(
    "/api/chats/:userId/conversations/:receiverId",
    ownerMiddleware,
    async (req, res) => {
      try {
        const { userId, receiverId } = req.params;
        const updates = req.body;
        // Ensure user can only update their own chats
        if (req.user._id !== userId) {
          return res.status(403).json({
            message: "Unauthorized: Can only update your own chats",
          });
        }

        const updateFields = {};
        if (updates.lastUpdated)
          updateFields["conversations.$.lastUpdated"] = new Date();

        const result = await chatCollection.updateOne(
          {
            userId: userId,
            "conversations.receiverId": receiverId,
          },
          {
            $set: {
              ...updateFields,
              lastUpdated: new Date(),
            },
          }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({
            message: "Chat conversation not found or not updated",
          });
        }

        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );
  //! Delete a specific conversation from user's chat
  app.delete(
    "/api/chats/:userId/conversations/:receiverId",
    ownerMiddleware,
    async (req, res) => {
      try {
        const { userId, receiverId } = req.params;
        // Ensure user can only delete their own chats
        if (req.user._id !== userId) {
          return res.status(403).json({
            message: "Unauthorized: Can only delete your own chats",
          });
        }

        const result = await chatCollection.updateOne(
          { userId: userId },
          {
            $pull: {
              conversations: { receiverId: receiverId },
            },
            $set: { lastUpdated: new Date() },
          }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({
            message: "Chat conversation not found or not deleted",
          });
        }

        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  // Add/Update message in a conversation (alternative to Socket.IO)
  app.post(
    "/api/chats/:userId/conversations/:receiverId/messages",
    ownerMiddleware,
    async (req, res) => {
      try {
        const { userId, receiverId } = req.params;
        const { message } = req.body;

        if (!message) {
          return res.status(400).json({
            message: "Message is required",
          });
        }

        // Ensure user can only add to their own chats
        if (req.user._id !== userId) {
          return res.status(403).json({
            message: "Unauthorized: Can only add to your own chats",
          });
        }

        const now = new Date();
        const newMsg = {
          message: message,
          timestamp: now,
        };

        const userChat = await chatCollection.findOne({ userId });

        if (userChat) {
          const existingConversation = userChat.conversations?.find(
            (conv) => conv.receiverId === receiverId
          );

          if (existingConversation) {
            await chatCollection.updateOne(
              {
                userId: userId,
                "conversations.receiverId": receiverId,
              },
              {
                $push: { "conversations.$.messages": newMsg },
                $set: {
                  "conversations.$.lastUpdated": now,
                  lastUpdated: now,
                },
              }
            );
          } else {
            await chatCollection.updateOne(
              { userId: userId },
              {
                $push: {
                  conversations: {
                    receiverId: receiverId,
                    messages: [newMsg],
                    lastUpdated: now,
                  },
                },
                $set: { lastUpdated: now },
              }
            );
          }
        } else {
          await chatCollection.insertOne({
            userId: userId,
            userName: req.user.name,
            userEmail: req.user.email,
            conversations: [
              {
                receiverId: receiverId,
                messages: [newMsg],
                lastUpdated: now,
              },
            ],
            createdAt: now,
            lastUpdated: now,
          });
        }

        res.status(201).json(newMsg);
      } catch (error) {
        next(error);
      }
    }
  );

  app.post("/api/groups", async (req, res) => {
    try {
      const { name, createdBy } = req.body;

      if (!name || !createdBy) {
        return res.status(400).json({
          message: "name and createdBy are required",
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
        return res.status(400).json({
          message: "Group not created",
        });
      }
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/groups", async (req, res) => {
    try {
      const groups = await groupCollection.find({}).toArray();
      res.status(200).json(groups);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { member, messages } = req.query;
      const group = await groupCollection.findOne({ _id: new ObjectId(id) });
      if (!group) {
        return res.status(404).json({
          message: "Group not found",
        });
      }
      if (member) {
        return res.status(200).json(group.members || []);
      }
      if (messages) {
        return res.status(200).json(group.messages || []);
      }
      res.status(200).json(group);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/posts", async (req, res) => {
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

      res.status(200).json({ totalPosts, posts });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const post = await postCollection.findOne({
        _id: new ObjectId(id),
      });
      res.status(200).json(post);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/posts", authMiddleware, async (req, res) => {
    try {
      const post = req.body;
      post.createdAt = new Date();
      const result = await postCollection.insertOne(post);
      if (!result.acknowledged) {
        return res.status(400).json({
          message: "Post not created",
        });
      }
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/posts/:id", authMiddleware, async (req, res) => {
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
        return res.status(403).json({
          message: "Unauthorized access",
        });
      }
      const result = await postCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: post }
      );
      if (result.modifiedCount === 0) {
        return res.status(400).json({
          message: "Post not found or updated",
        });
      }
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/posts/:id", authMiddleware, async (req, res) => {
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
        return res.status(403).json({
          message: "Unauthorized access",
        });
      }
      const result = await postCollection.deleteOne({
        _id: new ObjectId(id),
      });
      if (result.deletedCount === 0) {
        return res.status(400).json({
          message: "Post not found or deleted",
        });
      }
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/comments/:postId", async (req, res) => {
    try {
      const { postId } = req.params;
      const post = await postCollection.findOne({
        _id: new ObjectId(postId),
      });
      if (!post) {
        return res.status(404).json({ message: "post not found." });
      }
      const comments = post.comments || [];
      res.status(200).json(comments);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/comments/:postId", async (req, res) => {
    try {
      const { postId } = req.params;
      const { comment, userId, userName, userEmail } = req.body;
      if (!comment || !userId || !userName || !userEmail) {
        return res.status(400).json({
          message:
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
        return res.status(404).json({
          message: "Post not found or comment not added.",
        });
      }
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/comments/:postId", async (req, res) => {
    try {
      const { postId } = req.params;
      const { comment, userId } = req.body;
      if (!userId || !comment) {
        return res.status(400).json({
          message: "Missing required fields: userId and comment.",
        });
      }
      const post = await postCollection.findOne({
        _id: new ObjectId(postId),
      });
      if (!post) {
        return res.status(404).json({ message: "post not found." });
      }
      const findComment = post.comments?.find((rev) => rev.userId === userId);
      if (!findComment) {
        return res.status(404).json({ message: "Comment not found." });
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
        return res.status(404).json({
          message: "Failed to update comment.",
        });
      }
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/comments/:postId", async (req, res) => {
    try {
      const { postId } = req.params;
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "Missing user." });
      }
      const post = await postCollection.findOne({
        _id: new ObjectId(postId),
      });
      if (!post) {
        return res.status(404).json({ message: "post not found." });
      }
      const commentIndex = post.comments?.findIndex(
        (rev) => rev.userEmail === userEmail
      );
      if (commentIndex === -1) {
        return res.status(404).json({ message: "comment not found." });
      }
      const result = await postCollection.updateOne(
        { _id: new ObjectId(postId) },
        { $pull: { comments: { userEmail: userEmail } } }
      );
      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Failed to delete comment.",
        });
      }
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.use((_req, res, error) => {
    console.error("❌ Server Error:", error.message || error);
    res.status(error.status || 500).json({
      message: error.message || "Internal Server Error",
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
