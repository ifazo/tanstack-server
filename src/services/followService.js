import { ObjectId } from "mongodb";
import { getDB } from "../config/database.js";
import { throwError } from "../utils/errorHandler.js";

const getFollowCollection = () => getDB().collection("follows");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const followUser = async ({userId, targetId}) => {
  if (userId === targetId) throwError(400, "Cannot follow yourself");

  const follows = getFollowCollection();
  const uOid = toObjectId(userId);
  const tOid = toObjectId(targetId);

  const exists = await follows.findOne({ follower: uOid, following: tOid });
  if (exists) return { followed: false, message: "Already following" };

  const doc = { follower: uOid, following: tOid, createdAt: new Date() };
  const result = await follows.insertOne(doc);
  return result;
};

export const unfollowUser = async ({userId, targetId}) => {
  const follows = getFollowCollection();
  const uOid = toObjectId(userId);
  const tOid = toObjectId(targetId);

  const res = await follows.deleteOne({ follower: uOid, following: tOid });
  return { unfollowed: res.deletedCount > 0 };
};

export const getFollowers = async (userId) => {
  const follows = getFollowCollection();
  const uOid = toObjectId(userId);

  const result = await follows
    .aggregate([
      { $match: { following: uOid } },
      { $sort: { createdAt: -1 } },

      {
        $lookup: {
          from: "users",
          localField: "follower",
          foreignField: "_id",
          as: "followerUser",
        },
      },
      { $unwind: { path: "$followerUser", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: "$followerUser._id",
          name: "$followerUser.name",
          image: "$followerUser.image",
          followedAt: "$createdAt",
        },
      },
    ])
    .toArray();

  return result;
};

export const getFollowing = async (userId) => {
  const follows = getFollowCollection();
  const uOid = toObjectId(userId);

  const result = await follows
    .aggregate([
      { $match: { follower: uOid } },
      { $sort: { createdAt: -1 } },

      {
        $lookup: {
          from: "users",
          localField: "following",
          foreignField: "_id",
          as: "followingUser",
        },
      },
      { $unwind: { path: "$followingUser", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: "$followingUser._id",
          name: "$followingUser.name",
          image: "$followingUser.image",
          followedAt: "$createdAt",
        },
      },
    ])
    .toArray();

  return result;
};

export const isFollowing = async ({userId, targetId}) => {
  const follows = getFollowCollection();
  const uOid = toObjectId(userId);
  const tOid = toObjectId(targetId);
  const doc = await follows.findOne({ follower: uOid, following: tOid });
  return !!doc;
};
