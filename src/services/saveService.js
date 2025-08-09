import { getDB } from '../config/database.js';
import { ObjectId, Timestamp } from 'mongodb';

const getSaveCollection = () => getDB().collection('saves');
const getPostCollection = () => getDB().collection('posts');

export const savePost = async (postId, userId = {}) => {
  if (!ObjectId.isValid(postId)) throw new Error('Invalid post ID');
  const saves = getSaveCollection();
  const posts = getPostCollection();

  const post = await posts.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');

  const existing = await saves.findOne({ postId, userId });
  if (existing) throw new Error('Already saved');

  const doc = {
    postId,
    userId,
    timestamp: Timestamp.fromDate(new Date())
  };
  const result = await saves.insertOne(doc);
  if (!result.acknowledged) throw new Error('Save failed');

  await posts.updateOne({ _id: new ObjectId(postId) }, { $inc: { savesCount: 1 } });

  return { _id: result.insertedId, ...doc };
};

export const unsavePost = async (postId, userId) => {
  if (!ObjectId.isValid(postId)) throw new Error('Invalid post ID');
  const saves = getSaveCollection();
  const posts = getPostCollection();

  const result = await saves.deleteOne({ postId, userId });
  if (result.deletedCount === 0) throw new Error('Not saved');

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
  if (!ObjectId.isValid(postId)) throw new Error('Invalid post ID');
  const saves = getSaveCollection();
  const existing = await saves.findOne({ postId, userId });
  return { isSaved: !!existing };
};