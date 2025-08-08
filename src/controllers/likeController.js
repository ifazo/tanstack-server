import { 
  addLikeToPost as addLikeToPostService,
  removeLikeFromPost as removeLikeFromPostService,
  getPostLikes as getPostLikesService,
  checkUserLikedPost as checkUserLikedPostService,
  getUserLikes as getUserLikesService,
  getPostLikeCount as getPostLikeCountService,
  getMostLikedPosts as getMostLikedPostsService,
  getLikeStatistics as getLikeStatisticsService,
  togglePostLike as togglePostLikeService
} from '../services/likeService.js';

export const addLikeToPost = async (req, res, next) => {
  try {
    const { postId, userId } = req.params;

    if (!postId || !userId) {
      return res.status(400).json({
        message: "postId and userId are required",
      });
    }

    const result = await addLikeToPostService(postId, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const removeLikeFromPost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const result = await removeLikeFromPostService(postId, req.user._id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getPostLikes = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const queryParams = req.query;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const result = await getPostLikesService(postId, queryParams);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const checkUserLikedPost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const result = await checkUserLikedPostService(postId, req.user._id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getUserLikes = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const queryParams = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const result = await getUserLikesService(userId, queryParams);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getPostLikeCount = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const result = await getPostLikeCountService(postId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMostLikedPosts = async (req, res, next) => {
  try {
    const queryParams = req.query;
    const result = await getMostLikedPostsService(queryParams);
    res.status(200).json({
      mostLikedPosts: result,
      totalResults: result.length
    });
  } catch (error) {
    next(error);
  }
};

export const getLikeStatistics = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const result = await getLikeStatisticsService(postId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const togglePostLike = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const result = await togglePostLikeService(postId, req.user._id, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};