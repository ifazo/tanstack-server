import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import { throwError } from "../utils/errorHandler.js";

const getPostCollection = () => getDB().collection('posts');
const getSaveCollection = () => getDB().collection('post_saves');

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const savePost = async (postId, userId = {}) => {
  if (!ObjectId.isValid(postId)) throwError(400, 'Invalid post ID');
  const saves = getSaveCollection();
  const posts = getPostCollection();

  const post = await posts.findOne({ _id: new ObjectId(postId) });
  if (!post) throwError(404, 'Post not found');

  const existing = await saves.findOne({ postId, userId });
  if (existing) throwError(409, 'Already saved');

  const doc = {
    postId: toObjectId(postId),
    userId: toObjectId(userId),
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

  const result = await saves.deleteOne({ postId: toObjectId(postId), userId: toObjectId(userId) });
  if (result.deletedCount === 0) throwError(404, 'Not saved');

  await posts.updateOne({ _id: new ObjectId(postId) }, { $inc: { savesCount: -1 } });
  await posts.updateOne({ _id: new ObjectId(postId), savesCount: { $lt: 0 } }, { $set: { savesCount: 0 } });

  return { message: 'Unsaved' };
};

export const getUserSavedPosts = async (userId) => {
  const saves = getSaveCollection();
  const posts = getPostCollection();

  const result = await saves.find({ userId: toObjectId(userId) }).toArray();
  const postIds = result.map(r => r.postId);
  const savedPosts = await posts.find({ _id: { $in: postIds } }).toArray();

  return { total: savedPosts.length, items: savedPosts };
};

export const isPostSavedByUser = async (postId, userId) => {
  if (!ObjectId.isValid(postId)) throwError(400, 'Invalid post ID');
  const saves = getSaveCollection();
  const existing = await saves.findOne({ postId: toObjectId(postId), userId: toObjectId(userId) });
  return { isSaved: !!existing };
};