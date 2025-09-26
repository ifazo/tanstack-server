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

  const pipeline = [
    {
      $match: {
        status: "accepted",
        $or: [{ from: uOid }, { to: uOid }],
      },
    },
    {
      $addFields: {
        friendId: {
          $cond: [{ $eq: ["$from", uOid] }, "$to", "$from"],
        },
      },
    },
    {
      $lookup: {
        from: storyCollection.collectionName,
        let: { fid: "$friendId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$fid"] },
            },
          },
          { $sort: { createdAt: -1 } },
        ],
        as: "stories",
      },
    },
    { $unwind: "$stories" },
    { $replaceRoot: { newRoot: "$stories" } },
    { $sort: { createdAt: -1 } },
  ];

  const stories = await friendsCollection.aggregate(pipeline).toArray();
  return stories;
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