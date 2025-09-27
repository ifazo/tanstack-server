import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";
import { throwError } from "../utils/errorHandler.js";

const getStoryCollection = () => getDB().collection("stories");
const getFriendCollection = () => getDB().collection("friends");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const getFriendsStories = async (userId) => {
  const friendsCollection = getFriendCollection();
  const storyCollection = getStoryCollection();
  const uOid = toObjectId(userId);

  const friends = await friendsCollection
    .find({
      status: "accepted",
      $or: [{ from: uOid }, { to: uOid }],
    })
    .toArray();

  const friendIds = friends.map((f) =>
    f.from.equals(uOid) ? f.to : f.from
  );

  if (friendIds.length === 0) return [];

  const pipeline = [
    { $match: { userId: { $in: friendIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$userId",
        stories: {
          $push: {
            _id: "$_id",
            media: "$media",
            type: "$type",
            createdAt: "$createdAt",
          },
        },
        updatedAt: { $first: "$createdAt" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $project: { name: 1, username: 1, image: 1 },
          },
        ],
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        userId: "$_id",
        user: 1,
        stories: 1,
        updatedAt: 1,
        _id: 0,
      },
    },
    { $sort: { updatedAt: -1 } },
  ];

  const result = await storyCollection.aggregate(pipeline).toArray();
  return result;
};

export const getUserStories = async (userId) => {
  const storyCollection = getStoryCollection();
  const uOid = toObjectId(userId);

  const stories = await storyCollection
    .find({ userId: uOid })
    .sort({ createdAt: -1 })
    .toArray();

  return stories;
};

export const createStory = async ({ userId, media, type }) => {
  const storyCollection = getStoryCollection();

  const data = {
    userId: toObjectId(userId),
    media,
    type,
    createdAt: new Date(),
  };

  const result = await storyCollection.insertOne(data);

  if (!result.acknowledged) {
    throwError(500, "Failed to create story");
  }

  return result;
};

export const deleteStory = async ({storyId, userId}) => {
  const storyCollection = getStoryCollection();

  const story = await storyCollection.findOne({ _id: toObjectId(storyId) });
  if (!story) {
    throwError(404, "Story not found");
  }

  if (!story.userId.equals(toObjectId(userId))) {
    throwError(403, "You are not authorized to delete this story");
  }

  const result = await storyCollection.deleteOne({ _id: toObjectId(storyId) });

  if (result.deletedCount === 0) {
    throwError(404, "Failed to delete story");
  }

  return result;
};