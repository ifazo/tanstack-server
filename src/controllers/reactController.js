import { ObjectId } from "mongodb";
import {
  addReactToPost as addReactToPostService,
  removeReactFromPost as removeReactFromPostService,
  getUserReacts as getUserReactsService,
  checkPostReact as checkPostReactService
} from "../services/reactService.js";

export const addReactToPost = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;
    const { react } = req.query;

    if (!postId || !userId || !ObjectId.isValid(postId) || !ObjectId.isValid(userId) || !react) {
      return res.status(400).json({
        message: "postId, userId and react are required",
      });
    }

    const result = await addReactToPostService({ postId, userId, react });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const removeReactFromPost = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    if (!postId || !userId || !ObjectId.isValid(postId) || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "postId and userId are required",
      });
    }

    const result = await removeReactFromPostService({ userId, postId });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getUserReacts = async (req, res, next) => {
  try {
    const userId = req.user._id;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const result = await getUserReactsService(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const checkPostReactByUser = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    if (!postId || !userId) {
      return res.status(400).json({
        message: "postId and userId are required",
      });
    }

    const result = await checkPostReactService({ postId, userId });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
