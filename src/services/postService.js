import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import errorHandler from '../middleware/errorHandler.js';

const getPostCollection = () => {
  const db = getDB();
  return db.collection('posts');
};

export const createPost = async (postData) => {
  const postCollection = getPostCollection();
  
  const post = {
    ...postData,
    createdAt: new Date(),
    updatedAt: new Date(),
    comments: [],
    likes: 0,
    views: 0
  };

  const result = await postCollection.insertOne(post);
  
  if (!result.acknowledged) {
    errorHandler(500, 'Failed to create post');
  }
  
  return {
    _id: result.insertedId,
    ...post
  };
};

export const getAllPosts = async (queryParams) => {
  const postCollection = getPostCollection();
  const { search, skip = 0, limit = 10, sort = 'desc', sortBy = 'createdAt' } = queryParams;
  
  let query = {};

  // Build search query
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } }
    ];
  }

  // Get total count for pagination
  const totalPosts = await postCollection.countDocuments(query);
  
  // Build aggregation pipeline for better performance
  let cursor = postCollection.find(query);

  // Apply pagination
  cursor = cursor.skip(parseInt(skip)).limit(parseInt(limit));

  // Apply sorting
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
    hasNextPage: (parseInt(skip) + parseInt(limit)) < totalPosts,
    hasPrevPage: parseInt(skip) > 0
  };
};

export const getPostById = async (postId) => {
  const postCollection = getPostCollection();
  
  if (!ObjectId.isValid(postId)) {
    errorHandler(400, 'Invalid post ID format');
  }
  
  const post = await postCollection.findOne({
    _id: new ObjectId(postId),
  });
  
  if (!post) {
    errorHandler(404, 'Post not found');
  }
  
  // Increment view count
  await postCollection.updateOne(
    { _id: new ObjectId(postId) },
    { $inc: { views: 1 } }
  );
  
  return { ...post, views: (post.views || 0) + 1 };
};

export const updatePost = async (postId, updateData) => {
  const postCollection = getPostCollection();
  
  if (!ObjectId.isValid(postId)) {
    errorHandler(400, 'Invalid post ID format');
  }
  
  // Add updated timestamp
  updateData.updatedAt = new Date();
  
  const result = await postCollection.updateOne(
    { _id: new ObjectId(postId) },
    { $set: updateData }
  );

  if (result.modifiedCount === 0) {
    errorHandler(404, 'Post not found or no changes made');
  }
  
  return result;
};

export const deletePost = async (postId) => {
  const postCollection = getPostCollection();
  
  if (!ObjectId.isValid(postId)) {
    errorHandler(400, 'Invalid post ID format');
  }
  
  const result = await postCollection.deleteOne({
    _id: new ObjectId(postId),
  });
  
  if (result.deletedCount === 0) {
    errorHandler(404, 'Post not found');
  }
  
  return result;
};

export const getPostsByUserId = async (userId, queryParams = {}) => {
  const postCollection = getPostCollection();
  const { skip = 0, limit = 10, sort = 'desc', sortBy = 'createdAt' } = queryParams;
  
  const query = { userId: userId };
  const totalPosts = await postCollection.countDocuments(query);
  
  let cursor = postCollection.find(query);
  cursor = cursor.skip(parseInt(skip)).limit(parseInt(limit));
  
  if (sortBy && sort) {
    const sortDirection = sort === "asc" ? 1 : -1;
    cursor = cursor.sort({ [sortBy]: sortDirection });
  }
  
  const posts = await cursor.toArray();
  
  return {
    posts,
    totalPosts,
    currentPage: Math.floor(parseInt(skip) / parseInt(limit)) + 1,
    totalPages: Math.ceil(totalPosts / parseInt(limit))
  };
};

export const searchPosts = async (searchTerm, filters = {}) => {
  const postCollection = getPostCollection();
  
  const query = {
    $or: [
      { title: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
      { content: { $regex: searchTerm, $options: "i" } },
      { tags: { $regex: searchTerm, $options: "i" } }
    ]
  };
  
  // Apply additional filters
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.userId) {
    query.userId = filters.userId;
  }
  
  if (filters.dateFrom) {
    query.createdAt = { $gte: new Date(filters.dateFrom) };
  }
  
  if (filters.dateTo) {
    query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };
  }
  
  const posts = await postCollection.find(query).sort({ createdAt: -1 }).toArray();
  
  return posts;
};

export const getPostStats = async (postId) => {
  const postCollection = getPostCollection();
  
  const post = await postCollection.findOne(
    { _id: new ObjectId(postId) },
    { projection: { likes: 1, views: 1, comments: 1 } }
  );
  
  if (!post) {
    errorHandler(404, 'Post not found');
  }
  
  return {
    likes: post.likes || 0,
    views: post.views || 0,
    comments: post.comments?.length || 0
  };
};