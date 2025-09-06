import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";
import errorHandler from "../middleware/errorHandler.js";

const getCommentCollection = () => {
  const db = getDB();
  return db.collection("post_comments");
};

export const addPostComment = async ({ postId, userId, comment }) => {
  const commentCollection = getCommentCollection();

  const newComment = {
    postId: postId,
    userId: userId,
    comment: comment,
    createdAt: new Date(),
  };

  const result = await commentCollection.insertOne(newComment);

  if (!result.acknowledged) {
    errorHandler(500, "Failed to add comment");
  }

  return result;
};

export const getPostCommentsById = async (postId) => {
  const commentCollection = getCommentCollection();

  if (!ObjectId.isValid(postId)) {
    errorHandler(400, "Invalid post ID format");
  }

  const result = await commentCollection.find({ postId: postId }).toArray();

  return result;
};

export const updatePostComment = async ({ commentId, userId, comment }) => {
  const commentCollection = getCommentCollection();

  if (!ObjectId.isValid(commentId)) {
    errorHandler(400, "Invalid comment ID format");
  }

  // First check if comment exists and user owns it
  const existingComment = await commentCollection.findOne({
    _id: new ObjectId(commentId),
    userId: userId,
  });

  if (!existingComment) {
    errorHandler(
      404,
      "Comment not found or you are not authorized to update this comment"
    );
  }

  const updatedData = {
    comment: comment,
    updatedAt: new Date(),
  };

  const result = await commentCollection.updateOne(
    { _id: new ObjectId(commentId) },
    { $set: updatedData }
  );

  if (result.modifiedCount === 0) {
    errorHandler(500, "Comment not updated or no changes made");
  }

  return result;
};

export const deletePostComment = async (commentId, userId) => {
  const commentCollection = getCommentCollection();

  if (!ObjectId.isValid(commentId)) {
    errorHandler(400, "Invalid comment ID format");
  }

  // First check if comment exists and user owns it
  const existingComment = await commentCollection.findOne({
    _id: new ObjectId(commentId),
    userId: userId,
  });

  if (!existingComment) {
    errorHandler(
      404,
      "Comment not found or you are not authorized to delete this comment"
    );
  }

  const result = await commentCollection.deleteOne({
    _id: new ObjectId(commentId),
  });

  if (result.deletedCount === 0) {
    errorHandler(500, "Comment not deleted");
  }

  return result;
};

export const getCommentsByUserId = async (userId) => {
  const commentCollection = getCommentCollection();

  const result = await commentCollection.find({ userId: userId }).toArray();

  return result;
};
