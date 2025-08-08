import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import { JWT_SECRET_TOKEN } from '../config/environment.js';
import errorHandler from '../middleware/errorHandler.js';

const getUserCollection = () => {
  const db = getDB();
  return db.collection('users');
};

export const createUser = async (userData) => {
  const { name, email, password } = userData;
  const userCollection = getUserCollection();
  
  // Check if user already exists
  const existingUser = await userCollection.findOne({ email });
  if (existingUser) {
    errorHandler(400, 'User already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create user
  const user = { 
    name, 
    email, 
    password: hashedPassword,
    createdAt: new Date()
  };
  
  const result = await userCollection.insertOne(user);
  
  if (!result.acknowledged) {
    errorHandler(500, 'Failed to create user');
  }

  // Create payload for JWT
  const payload = {
    _id: result.insertedId.toString(),
    name: user.name,
    email: user.email,
  };

  // Generate token
  const token = jwt.sign(payload, JWT_SECRET_TOKEN);

  return {
    token,
    user: payload
  };
};

export const getAllUsers = async () => {
  const userCollection = getUserCollection();
  return await userCollection.find().toArray();
};

export const findUserById = async (userId) => {
  const userCollection = getUserCollection();
  const user = await userCollection.findOne({ _id: new ObjectId(userId) });
  
  if (!user) {
    errorHandler(404, 'User not found');
  }
  
  return user;
};

export const updateUser = async (userId, updateData) => {
  const userCollection = getUserCollection();
  
  // Add updated timestamp
  updateData.updatedAt = new Date();
  
  const result = await userCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: updateData }
  );

  if (result.modifiedCount === 0) {
    errorHandler(404, 'User not found or no changes made');
  }
  
  return result;
};

export const deleteUser = async (userId) => {
  const userCollection = getUserCollection();
  
  const result = await userCollection.deleteOne({
    _id: new ObjectId(userId),
  });

  if (result.deletedCount === 0) {
    errorHandler(404, 'User not found');
  }
  
  return result;
};

export const findUserByEmail = async (email) => {
  const userCollection = getUserCollection();
  return await userCollection.findOne({ email });
};

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

export const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};