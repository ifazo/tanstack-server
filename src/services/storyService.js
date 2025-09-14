import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";
import { throwError } from "../utils/errorHandler.js";
import cloudinary from "../config/cloudinary.js";

const getStoryCollection = () => getDB().collection("stories");
const getUserCollection = () => getDB().collection("users");

export const createStory = async ({ userId, media, type }) => {
  const storyCollection = getStoryCollection();

  const uploadResult = await cloudinary.v2.uploader.upload(media, {
    resource_type: type === "video" ? "video" : "image",
  });

  const story = {
    userId: new ObjectId(userId),
    mediaUrl: uploadResult.secure_url,
    mediaType: type,
    createdAt: new Date(),
  };

  const result = await storyCollection.insertOne(story);

  if (!result.acknowledged) {
    throwError(500, "Failed to create story");
  }

  return {
    _id: result.insertedId,
    ...story,
  };
};

export const getFriendsStories = async (userId) => {
  const storyCollection = getStoryCollection();
  const userCollection = getUserCollection();

  const user = await userCollection.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    throwError(404, "User not found");
  }

  const friendsIds = user.friends.map(friend => new ObjectId(friend));

  const stories = await storyCollection
    .find({ userId: { $in: friendsIds } })
    .sort({ createdAt: -1 })
    .toArray();

  return stories;
};

export const deleteStory = async (storyId, userId) => {
  const storyCollection = getStoryCollection();

  const story = await storyCollection.findOne({ _id: new ObjectId(storyId) });
  if (!story) {
    throwError(404, "Story not found");
  }

  if (!story.userId.equals(new ObjectId(userId))) {
    throwError(403, "You are not authorized to delete this story");
  }

  const result = await storyCollection.deleteOne({ _id: new ObjectId(storyId) });

  if (result.deletedCount === 0) {
    throwError(404, "Failed to delete story");
  }

  return result;
};