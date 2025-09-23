import bcrypt from 'bcrypt';
import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import { throwError } from "../utils/errorHandler.js";

const getUserCollection = () => getDB().collection("users");

export const findUsers = async ({ q }) => {
  const userCollection = getUserCollection();

  if (!q || !q.trim()) {
    return [];
  }

  const query = {
    $or: [
      { name: { $regex: q, $options: "i" } },
      { username: { $regex: q, $options: "i" } },
    ],
  };

  const users = await userCollection
    .find(query, {
      projection: { _id: 1, name: 1, image: 1, username: 1 },
    })
    .toArray();

  return users;
};

export const findUserById = async (userId) => {
  const userCollection = getUserCollection();
  const user = await userCollection.findOne({ _id: new ObjectId(userId) });
  
  if (!user) {
    throwError(404, 'User not found');
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
    throwError(404, 'User not found or no changes made');
  }
  
  return result;
};

export const deleteUser = async (userId) => {
  const userCollection = getUserCollection();
  
  const result = await userCollection.deleteOne({
    _id: new ObjectId(userId),
  });

  if (result.deletedCount === 0) {
    throwError(404, 'User not found');
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