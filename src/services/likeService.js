import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import errorHandler from '../middleware/errorHandler.js';

const getLikeCollection = () => {
  const db = getDB();
  return db.collection('likes');
};

const getPostCollection = () => {
  const db = getDB();
  return db.collection('posts');
};

export const addLikeToPost = async (postId, userId) => {
  const likeCollection = getLikeCollection();
  const postCollection = getPostCollection();
  
  if (!ObjectId.isValid(postId)) {
    errorHandler(400, 'Invalid post ID format');
  }
  
  // Check if post exists
  const post = await postCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) {
    errorHandler(404, 'Post not found');
  }
  
  // Check if user already liked this post
  const existingLike = await likeCollection.findOne({
    postId: postId,
    userId: userId
  });
  
  if (existingLike) {
    errorHandler(400, 'User has already liked this post');
  }
  
  const like = {
    postId: postId,
    userId: userId,
    timestamp: new Date()
  };
  
  // Insert like record
  const result = await likeCollection.insertOne(like);
  
  if (!result.acknowledged) {
    errorHandler(500, 'Failed to add like');
  }
  
  // Update post like count
  await postCollection.updateOne(
    { _id: new ObjectId(postId) },
    { 
      $inc: { likesCount: 1 },
      $set: { updatedAt: new Date() }
    }
  );
  
  return {
    _id: result.insertedId,
    ...like,
    message: 'Post liked successfully'
  };
};

export const removeLikeFromPost = async (postId, userId) => {
  const likeCollection = getLikeCollection();
  const postCollection = getPostCollection();
  
  if (!ObjectId.isValid(postId)) {
    errorHandler(400, 'Invalid post ID format');
  }
  
  // Check if like exists
  const existingLike = await likeCollection.findOne({
    postId: postId,
    userId: userId
  });
  
  if (!existingLike) {
    errorHandler(404, 'You have not liked this post');
  }
  
  // Remove like record
  const result = await likeCollection.deleteOne({
    postId: postId,
    userId: userId
  });
  
  if (result.deletedCount === 0) {
    errorHandler(500, 'Failed to remove like');
  }
  
  // Update post like count (ensure it doesn't go below 0)
  await postCollection.updateOne(
    { _id: new ObjectId(postId) },
    { 
      $inc: { likesCount: -1 },
      $set: { updatedAt: new Date() }
    }
  );
  
  // Ensure likesCount doesn't go negative
  await postCollection.updateOne(
    { _id: new ObjectId(postId), likesCount: { $lt: 0 } },
    { $set: { likesCount: 0 } }
  );
  
  return {
    message: 'Post unliked successfully',
    removedLike: existingLike
  };
};

export const getPostLikes = async (postId, queryParams = {}) => {
  const likeCollection = getLikeCollection();
  const { skip = 0, limit = 20, sort = 'desc', sortBy = 'timestamp' } = queryParams;
  
  if (!ObjectId.isValid(postId)) {
    errorHandler(400, 'Invalid post ID format');
  }
  
  const query = { postId: postId };
  
  // Get total count for pagination
  const totalLikes = await likeCollection.countDocuments(query);
  
  // Build cursor with pagination and sorting
  let cursor = likeCollection.find(query, {
    projection: { userId: 1, userName: 1, timestamp: 1 }
  });
  
  cursor = cursor.skip(parseInt(skip)).limit(parseInt(limit));
  
  if (sortBy && sort) {
    const sortDirection = sort === "asc" ? 1 : -1;
    cursor = cursor.sort({ [sortBy]: sortDirection });
  }
  
  const likes = await cursor.toArray();
  
  return {
    likes,
    totalLikes,
    currentPage: Math.floor(parseInt(skip) / parseInt(limit)) + 1,
    totalPages: Math.ceil(totalLikes / parseInt(limit)),
    hasNextPage: (parseInt(skip) + parseInt(limit)) < totalLikes,
    hasPrevPage: parseInt(skip) > 0
  };
};

export const checkUserLikedPost = async (postId, userId) => {
  const likeCollection = getLikeCollection();
  
  if (!ObjectId.isValid(postId)) {
    errorHandler(400, 'Invalid post ID format');
  }
  
  const like = await likeCollection.findOne({
    postId: postId,
    userId: userId
  });
  
  return {
    isLiked: !!like,
    likeDetails: like || null
  };
};

export const getUserLikes = async (userId, queryParams = {}) => {
  const likeCollection = getLikeCollection();
  const { skip = 0, limit = 20, sort = 'desc', sortBy = 'timestamp' } = queryParams;
  
  const query = { userId: userId };
  const totalLikes = await likeCollection.countDocuments(query);
  
  let cursor = likeCollection.find(query);
  cursor = cursor.skip(parseInt(skip)).limit(parseInt(limit));
  
  if (sortBy && sort) {
    const sortDirection = sort === "asc" ? 1 : -1;
    cursor = cursor.sort({ [sortBy]: sortDirection });
  }
  
  const likes = await cursor.toArray();
  
  return {
    likes,
    totalLikes,
    currentPage: Math.floor(parseInt(skip) / parseInt(limit)) + 1,
    totalPages: Math.ceil(totalLikes / parseInt(limit))
  };
};

export const getPostLikeCount = async (postId) => {
  const likeCollection = getLikeCollection();
  
  if (!ObjectId.isValid(postId)) {
    errorHandler(400, 'Invalid post ID format');
  }
  
  const count = await likeCollection.countDocuments({ postId: postId });
  return { likesCount: count };
};

export const getMostLikedPosts = async (queryParams = {}) => {
  const likeCollection = getLikeCollection();
  const { limit = 10, timeframe = 'all' } = queryParams;
  
  let matchStage = {};
  
  // Add time filter if specified
  if (timeframe !== 'all') {
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = null;
    }
    
    if (startDate) {
      matchStage.timestamp = { $gte: startDate };
    }
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: "$postId",
        likesCount: { $sum: 1 },
        latestLike: { $max: "$timestamp" }
      }
    },
    { $sort: { likesCount: -1, latestLike: -1 } },
    { $limit: parseInt(limit) }
  ];
  
  const mostLikedPosts = await likeCollection.aggregate(pipeline).toArray();
  
  return mostLikedPosts;
};

export const getLikeStatistics = async (postId) => {
  const likeCollection = getLikeCollection();
  
  if (!ObjectId.isValid(postId)) {
    errorHandler(400, 'Invalid post ID format');
  }
  
  const pipeline = [
    { $match: { postId: postId } },
    {
      $group: {
        _id: null,
        totalLikes: { $sum: 1 },
        firstLike: { $min: "$timestamp" },
        lastLike: { $max: "$timestamp" },
        uniqueUsers: { $addToSet: "$userId" }
      }
    },
    {
      $project: {
        _id: 0,
        totalLikes: 1,
        firstLike: 1,
        lastLike: 1,
        uniqueUsersCount: { $size: "$uniqueUsers" }
      }
    }
  ];
  
  const stats = await likeCollection.aggregate(pipeline).toArray();
  
  return stats.length > 0 ? stats[0] : {
    totalLikes: 0,
    firstLike: null,
    lastLike: null,
    uniqueUsersCount: 0
  };
};

export const togglePostLike = async (postId, userId, userInfo) => {
  const likeCollection = getLikeCollection();
  
  // Check if user already liked the post
  const existingLike = await likeCollection.findOne({
    postId: postId,
    userId: userId
  });
  
  if (existingLike) {
    // Unlike the post
    return await removeLikeFromPost(postId, userId);
  } else {
    // Like the post
    return await addLikeToPost(postId, userId, userInfo);
  }
};