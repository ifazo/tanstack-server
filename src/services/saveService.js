import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";
import { throwError } from "../utils/errorHandler.js";

const getSaveCollection = () => getDB().collection("post_saves");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const getUserSavedPosts = async (userId) => {
  const saveCollection = getSaveCollection();

  const pipeline = [
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
  ];

  const result = await saveCollection.aggregate(pipeline).toArray();
  return result;
};

export const savePost = async ({postId, userId}) => {
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

export const unsavePost = async ({ postId, userId }) => {
  const saves = getSaveCollection();

  const result = await saves.deleteOne({
    postId: toObjectId(postId),
    userId: toObjectId(userId),
  });

  if (result.deletedCount === 0) throwError(404, "Not saved");

  return result;
};

export const isPostSavedByUser = async ({ postId, userId }) => {
  const saves = getSaveCollection();

  const existing = await saves.findOne({
    postId: toObjectId(postId),
    userId: toObjectId(userId),
  });

  return { isSaved: !!existing };
};
