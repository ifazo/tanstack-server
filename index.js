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

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .send({ error: true, message: "Unauthorized access" });
    }
    const secret = process.env.JWT_SECRET_TOKEN;
    jwt.verify(token, secret);
    next();
  } catch (error) {
    return res.status(401).send({ error: true, message: error.message });
  }
};

const sendResponse = (res, status, data) => {
  res.status(status).send(data);
};

const errorHandler = (res, status, err) => {
  console.error(err.message);
  res
    .status(status || 500)
    .send({ error: true, message: err.message || "Internal Server Error" });
};

async function run() {
  const db = client.db(process.env.MONGODB_DB);
  const userCollection = db.collection("users");
  const postCollection = db.collection("posts");
  const chatCollection = db.collection("chats");

  app.get("/", (_req, res) => {
    sendResponse(res, 200, "Welcome to the Tanstack Server!");
  });

  app.get("/api", (_req, res) => {
    sendResponse(res, 200, { message: "Tanstack Server api is running!" });
  });

  app.post("/api/token", async (req, res) => {
    try {
      const data = req.body;
      const user = await userCollection.findOne({ email: data.email });
      if (!user) {
        return sendResponse(res, 400, {
          error: true,
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
      sendResponse(res, 200, { token });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await userCollection.findOne({ email });
      if (!user) {
        return sendResponse(res, 400, {
          error: true,
          message: "User does not exist",
        });
      }
      const isPasswordCorrect = await bcrypt.compare(password, user?.password);
      if (!isPasswordCorrect) {
        return sendResponse(res, 400, {
          error: true,
          message: "Password is incorrect",
        });
      }
      const payload = {
        name: user.name,
        email: user.email,
      };
      const JWTtoken = process.env.JWT_SECRET_TOKEN;
      const token = jwt.sign(payload, JWTtoken);
      sendResponse(res, 200, { token });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      const existingUser = await userCollection.findOne({ email });
      if (existingUser) {
        return sendResponse(res, 400, {
          error: true,
          message: "User already exists",
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = { name, email, password: hashedPassword };
      const createUser = await userCollection.insertOne(user);
      if (!createUser) {
        return sendResponse(res, 400, {
          error: true,
          message: "User not created",
        });
      }
      const payload = {
        name: user.name,
        email: user.email,
      };
      const JWTtoken = process.env.JWT_SECRET_TOKEN;
      const token = jwt.sign(payload, JWTtoken);
      sendResponse(res, 201, { token });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users", authMiddleware, async (_req, res) => {
    try {
      const users = await userCollection.find().toArray();
      sendResponse(res, 200, users);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await userCollection.findOne({ _id: new ObjectId(id) });
      sendResponse(res, 200, user);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.body;
      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: user }
      );
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/users/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await userCollection.deleteOne({
        _id: new ObjectId(id),
      });
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/chats/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const chats = await chatCollection.find({ userId }).toArray();
      sendResponse(res, 200, chats);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chats", async (req, res) => {
    try {
      const chat = req.body;
      const result = await chatCollection.insertOne(chat);
      sendResponse(res, 201, result);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/chats/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const chat = req.body;
      const result = await chatCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: chat }
      );
      sendResponse(res, 200, result);
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

      const products = await cursor.toArray();

      sendResponse(res, 200, { products, totalPosts });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, { message: "Internal Server Error" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const post = await postCollection.findOne({
        _id: new ObjectId(id),
      });
      sendResponse(res, 200, post);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/posts", authMiddleware, async (req, res) => {
    try {
      const post = req.body;
      const token = req.headers.authorization?.split(" ")[1];
      const JWTtoken = process.env.JWT_SECRET_TOKEN;
      const decodedToken = jwt.verify(token, JWTtoken);
      const { role } = decodedToken;
      if (role !== "admin") {
        return sendResponse(res, 403, {
          error: true,
          message: "Unauthorized access",
        });
      }
      const result = await postCollection.insertOne(post);
      sendResponse(res, 201, result);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/posts/:id", authMiddleware, async (req, res) => {
    try {
      const post = req.body;
      const { id } = req.params;
      const token = req.headers.authorization?.split(" ")[1];
      const JWTtoken = process.env.JWT_SECRET_TOKEN;
      const decodedToken = jwt.verify(token, JWTtoken);
      const { role } = decodedToken;
      if (role !== "admin") {
        return sendResponse(res, 403, {
          error: true,
          message: "Unauthorized access",
        });
      }
      const result = await postCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: post }
      );
      sendResponse(res, 200, result);
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
      const { role } = decodedToken;
      if (role !== "admin") {
        return sendResponse(res, 403, {
          error: true,
          message: "Unauthorized access",
        });
      }
      const result = await postCollection.deleteOne({
        _id: new ObjectId(id),
      });
      sendResponse(res, 200, result);
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
        return res.status(404).json({ message: "post not found." });
      }
      const comments = post.comments || [];
      sendResponse(res, 200, comments);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/comments/:postId", async (req, res, next) => {
    try {
      const { postId } = req.params;
      const { comment, userName, userEmail } = req.body;
      if (!comment || !userName || !userEmail) {
        return res.status(400).json({
          message:
            "All fields are required: comment, userName, userEmail.",
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
      if (result.modifiedCount === 0) {
        return res
          .status(404)
          .json({ message: "post not found or comment not added." });
      }
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/comments/:postId", async (req, res, next) => {
    try {
      const { postId } = req.params;
      const { comment, userEmail } = req.body;
      if (!userEmail || !comment) {
        return res.status(400).json({
          message:
            "Missing required fields: userEmail and at least one of comment.",
        });
      }
      const post = await postCollection.findOne({
        _id: new ObjectId(postId),
      });
      if (!post) {
        return res.status(404).json({ message: "post not found." });
      }
      const findComment = post.comments?.find(
        (rev) => rev.userEmail === userEmail
      );
      if (!findComment) {
        return res.status(404).json({ message: "Comment not found." });
      }
      const updateFields = {};
      if (rating) updateFields["comments.$[comment].rating"] = rating;
      if (comment) updateFields["comments.$[comment].comment"] = comment;
      const result = await postCollection.updateOne(
        { _id: new ObjectId(postId) },
        { $set: updateFields },
        {
          arrayFilters: [{ "comment.userEmail": userEmail }],
        }
      );
      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "Failed to update comment." });
      }
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/comments/:postId", async (req, res, next) => {
    try {
      const { postId } = req.params;
      const { userEmail } = req.body;

      if (!userEmail) {
        return res.status(400).json({ message: "Missing userEmail." });
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
      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "Failed to delete comment." });
      }
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  });

  app.use(errorHandler);
}

run().catch(console.dir);
