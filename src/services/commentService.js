import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";
import { throwError } from "../utils/errorHandler.js";

const getPostCommentCollection = () => getDB().collection("post_comments");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const getCommentsByUserId = async (userId) => {
  const commentCollection = getPostCommentCollection();

  const result = await commentCollection
    .aggregate([
      {
        $match: { userId: toObjectId(userId) },
      },

      {
        $lookup: {
          from: "posts",
          localField: "postId",
          foreignField: "_id",
          as: "post",
        },
      },
      { $unwind: "$post" },

      {
        $lookup: {
          from: "users",
          localField: "post.userId",
          foreignField: "_id",
          as: "postUser",
        },
      },
      { $unwind: "$postUser" },

      {
        $project: {
          _id: 1,
          text: 1,
          createdAt: 1,

          "post._id": 1,
          "post.text": 1,
          "post.createdAt": 1,

          "postUser._id": 1,
          "postUser.name": 1,
          "postUser.image": 1,
          "postUser.username": 1,
        },
      },
    ])
    .sort({ createdAt: -1 })
    .toArray();

  return result;
};

export const getPostCommentsById = async (postId) => {
  const commentCollection = getPostCommentCollection();

  const result = await commentCollection
    .aggregate([
      {
        $match: { postId: toObjectId(postId) },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,
          text: 1,
          createdAt: 1,
          "user._id": 1,
          "user.name": 1,
          "user.image": 1,
        },
      },
    ])
    .toArray();

  return result;
};

export const addPostComment = async ({ postId, userId, text }) => {
  const commentCollection = getPostCommentCollection();

  const commentData = {
    postId: toObjectId(postId),
    userId: toObjectId(userId),
    text,
    createdAt: new Date(),
  };

  const result = await commentCollection.insertOne(commentData);

  if (!result.acknowledged) {
    throwError(500, "Failed to add comment");
  }

  return result;
};

export const updatePostComment = async ({ commentId, userId, text }) => {
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
    text,
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
