import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import { throwError } from "../utils/errorHandler.js";

const getSaveCollection = () => getDB().collection('saves');
const getPostCollection = () => getDB().collection('posts');

export const savePost = async (postId, userId = {}) => {
  if (!ObjectId.isValid(postId)) throwError(400, 'Invalid post ID');
  const saves = getSaveCollection();
  const posts = getPostCollection();

  const post = await posts.findOne({ _id: new ObjectId(postId) });
  if (!post) throwError(404, 'Post not found');

  const existing = await saves.findOne({ postId, userId });
  if (existing) throwError(409, 'Already saved');

  const doc = {
    postId,
    userId,
    timestamp: new Date()
  };
  const result = await saves.insertOne(doc);
  if (!result.acknowledged) throwError(500, 'Save failed');

  await posts.updateOne({ _id: new ObjectId(postId) }, { $inc: { savesCount: 1 } });

  return { _id: result.insertedId, ...doc };
};

export const unsavePost = async (postId, userId) => {
  if (!ObjectId.isValid(postId)) throwError(400, 'Invalid post ID');
  const saves = getSaveCollection();
  const posts = getPostCollection();

  const result = await saves.deleteOne({ postId, userId });
  if (result.deletedCount === 0) throwError(404, 'Not saved');

  await posts.updateOne({ _id: new ObjectId(postId) }, { $inc: { savesCount: -1 } });
  await posts.updateOne({ _id: new ObjectId(postId), savesCount: { $lt: 0 } }, { $set: { savesCount: 0 } });

  return { message: 'Unsaved' };
};

export const toggleSave = async (postId, userId, userInfo = {}) => {
  const saves = getSaveCollection();
  const existing = await saves.findOne({ postId, userId });
  if (existing) {
    await unsavePost(postId, userId);
    return { toggled: 'removed' };
  }
  await savePost(postId, userId, userInfo);
  return { toggled: 'added' };
};

export const getUserSavedPosts = async (userId, query = {}) => {
  const { skip = 0, limit = 20 } = query;
  const saves = getSaveCollection();
  const cursor = saves.find({ userId })
    .skip(parseInt(skip))
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const items = await cursor.toArray();
  const total = await saves.countDocuments({ userId });

  return {
    total,
    items,
    skip: parseInt(skip),
    limit: parseInt(limit),
    hasNext: parseInt(skip) + parseInt(limit) < total
  };
};

export const isPostSavedByUser = async (postId, userId) => {
  if (!ObjectId.isValid(postId)) throwError(400, 'Invalid post ID');
  const saves = getSaveCollection();
  const existing = await saves.findOne({ postId, userId });
  return { isSaved: !!existing };
};