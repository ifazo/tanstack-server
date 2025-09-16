import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";
import { throwError } from "../utils/errorHandler.js";

const getPostCollection = () => getDB().collection("posts");
const getSaveCollection = () => getDB().collection("post_saves");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const savePost = async (postId, userId = {}) => {
  if (!ObjectId.isValid(postId)) throwError(400, "Invalid post ID");
  const saves = getSaveCollection();

  const existing = await saves.findOne({ postId: toObjectId(postId), userId: toObjectId(userId) });
  if (existing) throwError(409, "Already saved");

  const doc = {
    postId: toObjectId(postId),
    userId: toObjectId(userId),
    createdAt: new Date(),
  };

  const result = await saves.insertOne(doc);

  if (!result.acknowledged) throwError(500, "Save failed");

  return result;
};

export const unsavePost = async (postId, userId) => {
  if (!ObjectId.isValid(postId)) throwError(400, "Invalid post ID");
  const saves = getSaveCollection();

  const result = await saves.deleteOne({
    postId: toObjectId(postId),
    userId: toObjectId(userId),
  });

  if (result.deletedCount === 0) throwError(404, "Not saved");

  return result;
};

export const getUserSavedPosts = async (userId) => {
  const saves = getSaveCollection();
  const posts = getPostCollection();

  const result = await saves.find({ userId: toObjectId(userId) }).toArray();
  const postIds = result.map((r) => r.postId);
  const savedPosts = await posts.find({ _id: { $in: postIds } }).toArray();

  return { total: savedPosts.length, items: savedPosts };
};

export const isPostSavedByUser = async (postId, userId) => {
  if (!ObjectId.isValid(postId)) throwError(400, "Invalid post ID");
  const saves = getSaveCollection();

  const existing = await saves.findOne({
    postId: toObjectId(postId),
    userId: toObjectId(userId),
  });

  return { isSaved: !!existing };
};
