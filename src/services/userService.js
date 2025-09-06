import bcrypt from 'bcrypt';
import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import errorHandler from '../middleware/errorHandler.js';

const getUserCollection = () => getDB().collection("users");

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