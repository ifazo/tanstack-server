import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";
import { throwError } from "../utils/errorHandler.js";

const getPostCommentCollection = () => getDB().collection("post_comments");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const addPostComment = async ({ postId, userId, comment }) => {
  const commentCollection = getPostCommentCollection();

  const commentData = {
    postId: toObjectId(postId),
    userId: toObjectId(userId),
    comment: comment,
    createdAt: new Date(),
  };

  const result = await commentCollection.insertOne(commentData);

  if (!result.acknowledged) {
    throwError(500, "Failed to add comment");
  }

  return result;
};

export const getPostCommentsById = async (postId) => {
  const commentCollection = getPostCommentCollection();

  const result = await commentCollection
    .find({ postId: toObjectId(postId) })
    .toArray();

  return result;
};

export const updatePostComment = async ({ commentId, userId, comment }) => {
  const commentCollection = getPostCommentCollection();

  const existingComment = await commentCollection.findOne({
    _id: toObjectId(commentId),
    userId: toObjectId(userId),
  });

  if (!existingComment) {
    throwError(
      404,
      "Comment not found or you are not authorized to update this comment"
    );
  }

  const updatedData = {
    comment: comment,
    updatedAt: new Date(),
  };

  const result = await commentCollection.updateOne(
    { _id: toObjectId(commentId) },
    { $set: updatedData }
  );

  if (result.modifiedCount === 0) {
    throwError(500, "Comment not updated or no changes made");
  }

  return result;
};

export const deletePostComment = async (commentId, userId) => {
  const commentCollection = getPostCommentCollection();

  if (!ObjectId.isValid(commentId)) {
    throwError(400, "Invalid comment ID format");
  }

  // First check if comment exists and user owns it
  const existingComment = await commentCollection.findOne({
    _id: toObjectId(commentId),
    userId: toObjectId(userId),
  });

  if (!existingComment) {
    throwError(
      404,
      "Comment not found or you are not authorized to delete this comment"
    );
  }

  const result = await commentCollection.deleteOne({
    _id: toObjectId(commentId),
  });

  if (result.deletedCount === 0) {
    throwError(500, "Comment not deleted");
  }

  return result;
};

export const getCommentsByUserId = async (userId) => {
  const commentCollection = getPostCommentCollection();

  const result = await commentCollection
    .find({ userId: toObjectId(userId) })
    .toArray();

  return result;
};
