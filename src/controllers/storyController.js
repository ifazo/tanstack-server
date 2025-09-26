import { ObjectId } from "mongodb";
import {
  createStory as createStoryService,
  getFriendsStories as getFriendsStoriesService,
  getUserStories as getUserStoriesService,
  deleteStory as deleteStoryService,
} from "../services/storyService.js";

export const createStory = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { media, type } = req.body;
    
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    if (!media || !type) {
      return res.status(400).json({
        message: "media and type are required",
      });
    }

    const story = await createStoryService({
      userId,
      media,
      type,
    });

    res.status(201).json(story);
  } catch (error) {
    next(error);
  }
};

export const getFriendsStories = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const stories = await getFriendsStoriesService(userId);
    res.status(200).json(stories);
  } catch (error) {
    next(error);
  }
};

export const getUserStories = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "userId is required",
      });
    }
    const stories = await getUserStoriesService(userId);
    res.status(200).json(stories);
  } catch (error) {
    next(error);
  }
};

export const deleteStory = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { storyId } = req.params;

    if (!storyId || !userId || !ObjectId.isValid(storyId) || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "storyId and userId are required",
      });
    }

    const result = await deleteStoryService({storyId, userId});
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
