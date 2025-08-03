import process from "node:process";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Stripe from "stripe";
import { Server } from "socket.io";

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const port = process.env.PORT;
const uri = process.env.MONGODB_URI;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
        userName: user.userName,
        userEmail: user.userEmail,
        timestamp: timestamp || new Date(),
        socketId: socket.id,
      };

      io.emit("receive_message", chatMessage);
      console.log(`Message from ${user.userName}: ${message}`);
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
        userName: user.userName,
        userEmail: user.userEmail,
        roomId,
        timestamp: timestamp || new Date(),
        socketId: socket.id,
      };

      io.to(roomId).emit("receive_room_message", chatMessage);
      console.log(
        `Room message from ${user.userName} in ${roomId}: ${message}`
      );
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
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized access" });
  }
  const secret = process.env.JWT_SECRET_TOKEN;
  try {
    jwt.verify(token, secret);
    next();
  } catch (error) {
    return res.status(401).send({ error: true, message: error.message });
  }
};

const sendResponse = (res, status, data) => {
  res.status(status).send(data);
};

const errorHandler = (err, _req, res, _next) => {
  console.error(err.message);
  sendResponse(res, 500, { error: true, message: "Internal Server Error" });
};

async function run() {
  const db = client.db(process.env.MONGODB_DB);
  const userCollection = db.collection("users");
  const productCollection = db.collection("products");
  const categoryCollection = db.collection("categories");
  const orderCollection = db.collection("orders");

  app.get("/", (_req, res) => {
    sendResponse(res, 200, "Welcome to the Tanstack Server!");
  });

  app.get("/api", (_req, res) => {
    sendResponse(res, 200, { message: "Tanstack Server api is running!" });
  });

  app.get("/api/payment", async (req, res, next) => {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Missing session ID" });
    }
    try {
      const session = await stripe.checkout.sessions.retrieve(id, {
        expand: ["line_items", "customer_details", "payment_intent"],
      });

      sendResponse(res, 200, session);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/payment", async (req, res, next) => {
    const { products, name, email } = req.body;
    const customer = await stripe.customers.create({
      email,
      name,
    });
    const items = products.map((product) => ({
      price_data: {
        currency: "usd",
        product_data: {
          images: [product.thumbnail],
          name: product.title,
        },
        unit_amount: Math.round(parseFloat(product.price) * 100),
      },
      quantity: product.quantity,
    }));
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: items,
        mode: "payment",
        customer: customer.id,
        success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/cancel`,
      });
      if (!session) {
        return res.status(400).json({ error: "Session not created" });
      } else {
        const order = {
          user: name,
          email,
          products,
          total: products.reduce(
            (acc, product) => acc + product.price * product.quantity,
            0
          ),
          status: "paid",
          createdAt: new Date(),
        };
        await orderCollection.insertOne(order);
      }
      sendResponse(res, 200, { id: session.id });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders", async (req, res) => {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }
    try {
      const orders = await orderCollection.find({ email }).toArray();
      sendResponse(res, 200, orders);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/token", async (req, res) => {
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
    const { name, email, password } = req.body;
    try {
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
    const { id } = req.params;
    try {
      const user = await userCollection.findOne({ _id: new ObjectId(id) });
      sendResponse(res, 200, user);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const user = req.body;
    try {
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
    const { id } = req.params;
    try {
      const result = await userCollection.deleteOne({
        _id: new ObjectId(id),
      });
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await categoryCollection.find().toArray();
      sendResponse(res, 200, categories);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/categories/random", async (_req, res) => {
    try {
      const categories = await categoryCollection
        .aggregate([{ $sample: { size: 5 } }])
        .toArray();
      sendResponse(res, 200, categories);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/categories/:category", async (req, res) => {
    const { category } = req.params;
    try {
      const products = await productCollection.find({ category }).toArray();
      sendResponse(res, 200, products);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/products", async (req, res) => {
    const { search, category, price, rating, skip, limit, sort, sortBy } =
      req.query;
    try {
      let query = {};

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      if (category) {
        query.category = category;
      }

      if (price) {
        const priceLimit = parseInt(price);
        query.price = { $lte: priceLimit };
      }

      if (rating) {
        const ratingValue = parseInt(rating);
        query.rating = { $gte: ratingValue };
      }

      const totalProducts = await productCollection.countDocuments(query);
      let cursor = productCollection.find(query);

      cursor = cursor.skip(parseInt(skip)).limit(parseInt(limit));

      if (sortBy && sort) {
        const sortDirection = sort === "asc" ? 1 : -1;
        const sortFields = { [sortBy]: sortDirection };
        cursor = cursor.sort(sortFields);
      }

      const products = await cursor.toArray();

      sendResponse(res, 200, { products, totalProducts });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, { message: "Internal Server Error" });
    }
  });

  app.get("/api/products/random", async (_req, res) => {
    try {
      const products = await productCollection
        .aggregate([{ $sample: { size: 5 } }])
        .toArray();
      sendResponse(res, 200, products);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const product = await productCollection.findOne({
        _id: new ObjectId(id),
      });
      sendResponse(res, 200, product);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/products", authMiddleware, async (req, res) => {
    const product = req.body;
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
    try {
      const result = await productCollection.insertOne(product);
      sendResponse(res, 201, result);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/products/:id", authMiddleware, async (req, res) => {
    const product = req.body;
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
    try {
      const result = await productCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: product }
      );
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/products/:id", authMiddleware, async (req, res) => {
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
    try {
      const result = await productCollection.deleteOne({
        _id: new ObjectId(id),
      });
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/reviews/:productId", async (req, res, next) => {
    const { productId } = req.params;
    try {
      const product = await productCollection.findOne({
        _id: new ObjectId(productId),
      });
      if (!product) {
        return res.status(404).json({ message: "Product not found." });
      }
      const reviews = product.reviews || [];
      sendResponse(res, 200, reviews);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/reviews/:productId", async (req, res, next) => {
    const { productId } = req.params;
    const { rating, comment, reviewerName, reviewerEmail } = req.body;
    if (!rating || !comment || !reviewerName || !reviewerEmail) {
      return res.status(400).json({
        message:
          "All fields are required: rating, comment, reviewerName, reviewerEmail.",
      });
    }
    const newReview = {
      rating,
      comment,
      date: new Date(),
      reviewerName,
      reviewerEmail,
    };
    try {
      const result = await productCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $push: { reviews: newReview } }
      );
      if (result.modifiedCount === 0) {
        return res
          .status(404)
          .json({ message: "Product not found or review not added." });
      }
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/reviews/:productId", async (req, res, next) => {
    const { productId } = req.params;
    const { rating, comment, reviewerEmail } = req.body;
    if (!reviewerEmail || (!rating && !comment)) {
      return res.status(400).json({
        message:
          "Missing required fields: reviewerEmail and at least one of rating or comment.",
      });
    }
    try {
      const product = await productCollection.findOne({
        _id: new ObjectId(productId),
      });
      if (!product) {
        return res.status(404).json({ message: "Product not found." });
      }
      const review = product.reviews?.find(
        (rev) => rev.reviewerEmail === reviewerEmail
      );
      if (!review) {
        return res.status(404).json({ message: "Review not found." });
      }
      const updateFields = {};
      if (rating) updateFields["reviews.$[review].rating"] = rating;
      if (comment) updateFields["reviews.$[review].comment"] = comment;
      const result = await productCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $set: updateFields },
        {
          arrayFilters: [{ "review.reviewerEmail": reviewerEmail }],
        }
      );
      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "Failed to update review." });
      }
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/reviews/:productId", async (req, res, next) => {
    const { productId } = req.params;
    const { reviewerEmail } = req.body;

    if (!reviewerEmail) {
      return res.status(400).json({ message: "Missing reviewerEmail." });
    }

    try {
      const product = await productCollection.findOne({
        _id: new ObjectId(productId),
      });
      if (!product) {
        return res.status(404).json({ message: "Product not found." });
      }
      const reviewIndex = product.reviews?.findIndex(
        (rev) => rev.reviewerEmail === reviewerEmail
      );
      if (reviewIndex === -1) {
        return res.status(404).json({ message: "Review not found." });
      }
      const result = await productCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $pull: { reviews: { reviewerEmail: reviewerEmail } } }
      );
      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "Failed to delete review." });
      }
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  });

  app.use(errorHandler);
}

run().catch(console.dir);
