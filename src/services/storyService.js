import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";
import { throwError } from "../utils/errorHandler.js";

const getStoryCollection = () => getDB().collection("stories");
const getUserCollection = () => getDB().collection("users");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const getFriendsStories = async (userId) => {
  const userCollection = getUserCollection();
  const storyCollection = getStoryCollection();
  const uOid = toObjectId(userId);

  const pipeline = [
    { $match: { _id: uOid } },
    { $project: { friends: 1 } },

    {
      $lookup: {
        from: storyCollection.collectionName,
        let: { friendsIds: "$friends" },
        pipeline: [
          { $match: { $expr: { $in: ["$userId", "$$friendsIds"] } } },
          { $sort: { createdAt: -1 } },
        ],
        as: "stories",
      },
    },
    { $project: { stories: 1 } },
  ];

  const result = await userCollection.aggregate(pipeline).next();
  if (!result) throwError(404, "User not found");

  return result.stories || [];
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