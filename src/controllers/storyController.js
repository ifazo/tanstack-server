import { createStory as createStoryService, getFriendsStories as getFriendsStoriesService, deleteStory as deleteStoryService } from "../services/storyService.js";

export const createStory = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { media, type } = req.body;

    if (!userId || !media || !type) {
      return res.status(400).json({
        message: "userId, media, and type are required",
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

    if (!userId) {
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

export const deleteStory = async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const userId = req.user?._id;

    if (!storyId) {
      return res.status(400).json({
        message: "storyId is required",
      });
    }

    const result = await deleteStoryService(storyId, userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};