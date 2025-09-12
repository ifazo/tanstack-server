import { MongoClient, ServerApiVersion } from "mongodb";
import { MONGODB_URI, MONGODB_DB } from "./environment.js";
import errorHandler from "../middleware/errorHandler.js";

let client;
let db;

export const connectDB = async () => {
  try {
    client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await client.connect();
    db = client.db(MONGODB_DB);

    console.log("✅ Connected to MongoDB!");
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    return null;
  }
};

export const getDB = () => {
  if (!db) {
    errorHandler(500, "Database not connected");
  }
  return db;
};

export const closeDB = async () => {
  if (client) {
    await client.close();
    console.log("🔒 MongoDB connection closed");
  }
};
