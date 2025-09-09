import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";
import { throwError } from "../utils/errorHandler.js";

const getPostCollection = () => getDB().collection("posts");
const getCommentsCollection = () => getDB().collection("comments");

export const createPost = async (postData) => {
  const postCollection = getPostCollection();

  const post = {
    ...postData,
    createdAt: new Date(),
  };

  const result = await postCollection.insertOne(post);

  if (!result.acknowledged) {
    throwError(500, "Failed to create post");
  }

  return {
    _id: result.insertedId,
    ...post,
  };
};

export const getAllPosts = async (queryParams) => {
  const postCollection = getPostCollection();
  const {
    search,
    skip = 0,
    limit = 10,
    sort = "desc",
    sortBy = "createdAt",
  } = queryParams;

  let query = {};

  if (search) {
    query.$or = [
      { text: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
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

  const posts = await cursor.toArray();

  return {
    posts,
    totalPosts,
    currentPage: Math.floor(parseInt(skip) / parseInt(limit)) + 1,
    totalPages: Math.ceil(totalPosts / parseInt(limit)),
  };
};

export const getPostById = async (postId) => {
  const postCollection = getPostCollection();

  if (!ObjectId.isValid(postId)) {
    throwError(400, "Invalid post ID format");
  }

  const post = await postCollection.findOne({
    _id: new ObjectId(postId),
  });

  if (!post) {
    throwError(404, "Post not found");
  }

  return post;
};

export const updatePost = async (postId, updateData) => {
  const postCollection = getPostCollection();

  if (!ObjectId.isValid(postId)) {
    throwError(400, "Invalid post ID format");
  }

  updateData.updatedAt = new Date();

  const result = await postCollection.updateOne(
    { _id: new ObjectId(postId) },
    { $set: updateData }
  );

  if (result.modifiedCount === 0) {
    throwError(404, "Post not found or no changes made");
  }

  return result;
};

export const deletePost = async (postId) => {
  const postCollection = getPostCollection();

  if (!ObjectId.isValid(postId)) {
    throwError(400, "Invalid post ID format");
  }

  const result = await postCollection.deleteOne({
    _id: new ObjectId(postId),
  });

  if (result.deletedCount === 0) {
    throwError(404, "Post not found");
  }

  return result;
};

export const getPostsByUserId = async (userId) => {
  const postCollection = getPostCollection();

  if (!ObjectId.isValid(postId)) {
    throwError(400, "Invalid post ID format");
  }

  const posts = await postCollection
    .find({ userId: userId })
    .sort({ createdAt: -1 })
    .toArray();

  return posts;
};

export const getPostStats = async (postId) => {
  if (!ObjectId.isValid(postId)) {
    throwError(400, "Invalid post ID format");
  }

  const postCollection = getPostCollection();
  const commentsCollection = getCommentsCollection();

  const oid = new ObjectId(postId);

  const post = await postCollection.findOne(
    { _id: oid },
    { projection: { likes: 1, views: 1 } }
  );

  if (!post) throwError(404, "Post not found");

  const comments = await commentsCollection
    .find({
      $or: [{ postId: oid }, { postId: postId }]
    })
    .sort({ createdAt: -1 })
    .toArray();

  return {
    postId,
    likes: post.likes || 0,
    views: post.views || 0,
    commentsCount: comments.length,
    comments,
  };
};
