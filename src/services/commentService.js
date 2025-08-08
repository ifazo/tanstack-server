import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import errorHandler from '../middleware/errorHandler.js';

const getCommentCollection = () => {
  const db = getDB();
  return db.collection('comments');
};

export const addComment = async ( postId, userId, comment) => {
  const commentCollection = getCommentCollection();
  
  const newComment = {
    postId: postId,
    comment: comment,
    userId: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    isEdited: false,
    replies: [],
    likes: 0
  };

  const result = await commentCollection.insertOne(newComment);
  
  if (!result.acknowledged) {
    errorHandler(500, 'Failed to add comment');
  }
  
  return {
    _id: result.insertedId,
    ...comment
  };
};

export const getCommentsByPostId = async (postId, queryParams = {}) => {
  const commentCollection = getCommentCollection();
  const { skip = 0, limit = 20, sort = 'desc', sortBy = 'createdAt' } = queryParams;
  
  if (!ObjectId.isValid(postId)) {
    errorHandler(400, 'Invalid post ID format');
  }
  
  const query = { postId: postId };
  
  // Get total count for pagination
  const totalComments = await commentCollection.countDocuments(query);
  
  // Build cursor with pagination and sorting
  let cursor = commentCollection.find(query);
  cursor = cursor.skip(parseInt(skip)).limit(parseInt(limit));
  
  if (sortBy && sort) {
    const sortDirection = sort === "asc" ? 1 : -1;
    cursor = cursor.sort({ [sortBy]: sortDirection });
  }
  
  const comments = await cursor.toArray();
  
  return {
    comments,
    totalComments,
    currentPage: Math.floor(parseInt(skip) / parseInt(limit)) + 1,
    totalPages: Math.ceil(totalComments / parseInt(limit)),
    hasNextPage: (parseInt(skip) + parseInt(limit)) < totalComments,
    hasPrevPage: parseInt(skip) > 0
  };
};

export const getCommentById = async (commentId) => {
  const commentCollection = getCommentCollection();
  
  if (!ObjectId.isValid(commentId)) {
    errorHandler(400, 'Invalid comment ID format');
  }
  
  const comment = await commentCollection.findOne({
    _id: new ObjectId(commentId)
  });
  
  if (!comment) {
    errorHandler(404, 'Comment not found');
  }
  
  return comment;
};

export const updateComment = async (commentId, updateData, userId) => {
  const commentCollection = getCommentCollection();
  
  if (!ObjectId.isValid(commentId)) {
    errorHandler(400, 'Invalid comment ID format');
  }
  
  // First check if comment exists and user owns it
  const existingComment = await commentCollection.findOne({
    _id: new ObjectId(commentId),
    userId: userId
  });
  
  if (!existingComment) {
    errorHandler(404, 'Comment not found or you are not authorized to update this comment');
  }
  
  const updatedData = {
    ...updateData,
    updatedAt: new Date(),
  };
  
  // Remove sensitive fields that shouldn't be updated
  delete updatedData._id;
  delete updatedData.createdAt;
  delete updatedData.userId;
  delete updatedData.postId;
  
  const result = await commentCollection.updateOne(
    { _id: new ObjectId(commentId) },
    { $set: updatedData }
  );
  
  if (result.modifiedCount === 0) {
    errorHandler(500, 'Comment not updated or no changes made');
  }
  
  return await getCommentById(commentId);
};

export const deleteComment = async (commentId, userId) => {
  const commentCollection = getCommentCollection();
  
  if (!ObjectId.isValid(commentId)) {
    errorHandler(400, 'Invalid comment ID format');
  }
  
  // First check if comment exists and user owns it
  const existingComment = await commentCollection.findOne({
    _id: new ObjectId(commentId),
    userId: userId
  });
  
  if (!existingComment) {
    errorHandler(404, 'Comment not found or you are not authorized to delete this comment');
  }
  
  const result = await commentCollection.deleteOne({
    _id: new ObjectId(commentId)
  });
  
  if (result.deletedCount === 0) {
    errorHandler(500, 'Comment not deleted');
  }
  
  return result;
};

export const getCommentsByUserId = async (userId, queryParams = {}) => {
  const commentCollection = getCommentCollection();
  const { skip = 0, limit = 20, sort = 'desc', sortBy = 'createdAt' } = queryParams;
  
  const query = { userId: userId };
  const totalComments = await commentCollection.countDocuments(query);
  
  let cursor = commentCollection.find(query);
  cursor = cursor.skip(parseInt(skip)).limit(parseInt(limit));
  
  if (sortBy && sort) {
    const sortDirection = sort === "asc" ? 1 : -1;
    cursor = cursor.sort({ [sortBy]: sortDirection });
  }
  
  const comments = await cursor.toArray();
  
  return {
    comments,
    totalComments,
    currentPage: Math.floor(parseInt(skip) / parseInt(limit)) + 1,
    totalPages: Math.ceil(totalComments / parseInt(limit))
  };
};

export const likeComment = async (commentId, userId) => {
  const commentCollection = getCommentCollection();
  
  if (!ObjectId.isValid(commentId)) {
    errorHandler(400, 'Invalid comment ID format');
  }
  
  const result = await commentCollection.updateOne(
    { _id: new ObjectId(commentId) },
    { 
      $inc: { likes: 1 },
      $addToSet: { likedBy: userId },
      $set: { updatedAt: new Date() }
    }
  );
  
  if (result.modifiedCount === 0) {
    errorHandler(404, 'Comment not found or already liked by this user');
  }
  
  return result;
};

export const unlikeComment = async (commentId, userId) => {
  const commentCollection = getCommentCollection();
  
  if (!ObjectId.isValid(commentId)) {
    errorHandler(400, 'Invalid comment ID format');
  }
  
  const result = await commentCollection.updateOne(
    { _id: new ObjectId(commentId) },
    { 
      $inc: { likes: -1 },
      $pull: { likedBy: userId },
      $set: { updatedAt: new Date() }
    }
  );
  
  if (result.modifiedCount === 0) {
    errorHandler(404, 'Comment not found or not liked by this user');
  }
  
  return result;
};

export const addReply = async (commentId, userId, comment) => {
  const commentCollection = getCommentCollection();
  
  if (!ObjectId.isValid(commentId)) {
    errorHandler(400, 'Invalid comment ID format');
  }
  
  const reply = {
    _id: new ObjectId(),
    userId: userId,
    comment: comment,
    createdAt: new Date(),
    updatedAt: new Date(),
    isEdited: false,
    likes: 0
  };
  
  const result = await commentCollection.updateOne(
    { _id: new ObjectId(commentId) },
    { 
      $push: { replies: reply },
      $set: { updatedAt: new Date() }
    }
  );
  
  if (result.modifiedCount === 0) {
    errorHandler(500, 'Failed to add reply');
  }
  
  return reply;
};

export const getCommentStats = async (postId) => {
  const commentCollection = getCommentCollection();
  
  const totalComments = await commentCollection.countDocuments({ postId: postId });
  const totalLikes = await commentCollection.aggregate([
    { $match: { postId: postId } },
    { $group: { _id: null, totalLikes: { $sum: "$likes" } } }
  ]).toArray();
  
  return {
    totalComments,
    totalLikes: totalLikes.length > 0 ? totalLikes[0].totalLikes : 0
  };
};