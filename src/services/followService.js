import { ObjectId } from "mongodb";
import { getDB } from "../config/database.js";
import { throwError } from "../utils/errorHandler.js";

const getFollowCollection = () => getDB().collection("follows");
const getUserCollection = () => getDB().collection("users");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const followUser = async (userId, targetId) => {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(targetId))
    throwError(400, "Invalid userId or targetId");
  if (userId === targetId) throwError(400, "Cannot follow yourself");

  const follows = getFollowCollection();
  const uOid = toObjectId(userId);
  const tOid = toObjectId(targetId);

  const exists = await follows.findOne({ follower: uOid, following: tOid });
  if (exists) return { followed: false, message: "Already following" };

  const doc = { follower: uOid, following: tOid, createdAt: new Date() };
  const r = await follows.insertOne(doc);
  return { _id: r.insertedId, ...doc, followed: true };
};

export const unfollowUser = async (userId, targetId) => {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(targetId))
    throwError(400, "Invalid user id");
  const follows = getFollowCollection();
  const uOid = toObjectId(userId);
  const tOid = toObjectId(targetId);

  const res = await follows.deleteOne({ follower: uOid, following: tOid });
  return { unfollowed: res.deletedCount > 0 };
};

export const isFollowing = async (userId, targetId) => {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(targetId)) return false;
  const follows = getFollowCollection();
  const uOid = toObjectId(userId);
  const tOid = toObjectId(targetId);
  const doc = await follows.findOne({ follower: uOid, following: tOid });
  return !!doc;
};

export const getFollowers = async (userId, { skip = 0, limit = 50 } = {}) => {
  if (!ObjectId.isValid(userId)) throwError(400, "Invalid user id");
  const follows = getFollowCollection();
  const users = getUserCollection();
  const uOid = toObjectId(userId);

  const docs = await follows
    .find({ following: uOid })
    .sort({ createdAt: -1 })
    .skip(parseInt(skip, 10))
    .limit(parseInt(limit, 10))
    .toArray();

  const followerIds = docs.map((d) => d.follower);
  const userDocs = await users
    .find({ _id: { $in: followerIds } })
    .project({ name: 1, image: 1 })
    .toArray();
  const map = new Map(userDocs.map((u) => [u._id.toString(), u]));

  return docs.map((d) => {
    const u = map.get(d.follower.toString()) || { _id: d.follower };
    return {
      _id: d.follower,
      name: u.name || null,
      image: u.image || null,
      followedAt: d.createdAt,
    };
  });
};

export const getFollowing = async (userId, { skip = 0, limit = 50 } = {}) => {
  if (!ObjectId.isValid(userId)) throwError(400, "Invalid user id");
  const follows = getFollowCollection();
  const users = getUserCollection();
  const uOid = toObjectId(userId);

  const docs = await follows
    .find({ follower: uOid })
    .sort({ createdAt: -1 })
    .skip(parseInt(skip, 10))
    .limit(parseInt(limit, 10))
    .toArray();

  const followingIds = docs.map((d) => d.following);
  const userDocs = await users
    .find({ _id: { $in: followingIds } })
    .project({ name: 1, image: 1 })
    .toArray();
  const map = new Map(userDocs.map((u) => [u._id.toString(), u]));

  return docs.map((d) => {
    const u = map.get(d.following.toString()) || { _id: d.following };
    return {
      _id: d.following,
      name: u.name || null,
      image: u.image || null,
      followedAt: d.createdAt,
    };
  });
};

export const getFollowSuggestions = async (userId, limit = 10) => {
  if (!ObjectId.isValid(userId)) throwError(400, "Invalid user id");
  const follows = getFollowCollection();
  const users = getUserCollection();
  const uOid = toObjectId(userId);

  const followed = await follows.find({ follower: uOid }).toArray();
  const followedSet = new Set(followed.map((f) => f.following.toString()));
  followedSet.add(uOid.toString());

  const excludeIds = Array.from(followedSet).map((id) => toObjectId(id));

  const top = await follows
    .aggregate([
      { $match: { following: { $nin: excludeIds } } },
      { $group: { _id: "$following", followerCount: { $sum: 1 } } },
      { $sort: { followerCount: -1 } },
      { $limit: parseInt(limit, 10) },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: "$user._id",
          name: "$user.name",
          image: "$user.image",
          followerCount: 1,
        },
      },
    ])
    .toArray();

  return top;
};
