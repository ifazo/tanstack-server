import { ObjectId } from "mongodb";
import { getDB } from "../config/database.js";
import { throwError } from "../utils/errorHandler.js";

const getPostReactCollection = () => getDB().collection("post_reacts");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const addReactToPost = async ({ postId, userId, react }) => {
  const reactCollection = getPostReactCollection();

  const reactData = {
    postId: toObjectId(postId),
    userId: toObjectId(userId),
    react: react,
    createdAt: new Date(),
  };

  const result = await reactCollection.updateOne(
    { postId: toObjectId(postId), userId: toObjectId(userId) },
    { $set: reactData },
    { upsert: true }
  );

  if (!result.acknowledged) {
    throwError(500, "Failed to add or update reaction");
  }

  return result;
};

export const removeReactFromPost = async ({ userId, postId }) => {
  const reactCollection = getPostReactCollection();

  const existingReact = await reactCollection.findOne({
    postId: toObjectId(postId),
    userId: toObjectId(userId),
  });

  if (!existingReact) {
    throwError(404, "You have not reacted to this post");
  }

  const result = await reactCollection.deleteOne({
    postId: toObjectId(postId),
    userId: toObjectId(userId),
  });

  if (result.deletedCount === 0) {
    throwError(500, "Failed to remove like");
  }

  return result;
};

export const getUserReacts = async (userId) => {
  const reactCollection = getPostReactCollection();

  const result = await reactCollection
    .find({ userId: toObjectId(userId) })
    .toArray();

  return result;
};

export const checkPostReact = async ({ userId, postId }) => {
  const reactCollection = getPostReactCollection();

  const react = await reactCollection.findOne(
    {
      postId: toObjectId(postId),
      userId: toObjectId(userId),
    },
    { projection: { react: 1 } }
  );

  const result = react
    ? { reacted: true, react: react.react }
    : { reacted: false, react: null };

  return result;
};
