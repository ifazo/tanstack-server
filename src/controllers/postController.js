import { ObjectId } from "mongodb";
import {
  createPost as createPostService,
  getAllPosts as getAllPostsService,
  getPostById as getPostByIdService,
  updatePost as updatePostService,
  deletePost as deletePostService,
  getPostsByUserId as getPostsByUserIdService,
} from "../services/postService.js";

export const createPost = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { text, images = [], mentions = [], tags = [] } = req.body;

    if (!userId || !ObjectId.isValid(userId) || !text) {
      return res.status(400).json({
        message: "userId & text are required",
      });
    }

    const post = await createPostService({
      userId,
      text,
      images,
      mentions,
      tags,
    });
    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
};

export const getAllPosts = async (req, res, next) => {
  try {
    const queryParams = req.query;
    const result = await getAllPostsService(queryParams);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getPostsByUserId = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const result = await getPostsByUserIdService(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getPostById = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId || !ObjectId.isValid(postId)) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const post = await getPostByIdService(postId);
    res.status(200).json(post);
  } catch (error) {
    next(error);
  }
};

export const updatePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { text, images = [], mentions = [], tags = [] } = req.body;

    if (!postId || !ObjectId.isValid(postId) || !text) {
      return res.status(400).json({
        message: "postId and text are required",
      });
    }

    const result = await updatePostService({
      postId,
      userId,
      text,
      images,
      mentions,
      tags,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId || !ObjectId.isValid(postId)) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const result = await deletePostService(postId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
