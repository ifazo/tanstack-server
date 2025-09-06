import {
  createPost as createPostService,
  getAllPosts as getAllPostsService,
  getPostById as getPostByIdService,
  updatePost as updatePostService,
  deletePost as deletePostService,
  getPostsByUserId as getPostsByUserIdService,
  getPostStats as getPostStatsService,
} from "../services/postService.js";

export const createPost = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { text, images = [], mentions = [], tags = [] } = req.body;

    if (!userId || !text) {
      return res.status(400).json({
        message: "userId & text are required",
      });
    }

    const postData = { userId, text, images, mentions, tags };

    const post = await createPostService(postData);
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

export const getPostById = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
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

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const updateData = { text, images, mentions, tags };

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "Update data is required",
      });
    }

    const result = await updatePostService(postId, updateData);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
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

export const getPostsByUserId = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const queryParams = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const result = await getPostsByUserIdService(userId, queryParams);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getPostStats = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const stats = await getPostStatsService(postId);
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};
