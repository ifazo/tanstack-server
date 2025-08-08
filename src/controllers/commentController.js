import { 
  addComment as addCommentService,
  getCommentsByPostId as getCommentsByPostIdService,
  getCommentById as getCommentByIdService,
  updateComment as updateCommentService,
  deleteComment as deleteCommentService,
  getCommentsByUserId as getCommentsByUserIdService,
  likeComment as likeCommentService,
  unlikeComment as unlikeCommentService,
  addReply as addReplyService,
  getCommentStats as getCommentStatsService
} from '../services/commentService.js';

export const addComment = async (req, res, next) => {
  try {
    const { postId, userId, comment } = req.body;

    if (!postId || !userId) {
      return res.status(400).json({
        message: "postId and userId are required",
      });
    }

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    if (comment.length > 1000) {
      return res.status(400).json({
        message: "Comment must be less than 1000 characters",
      });
    }

    const commentData = {
      postId,
      userId,
      comment: comment.trim(),
    };

    const newComment = await addCommentService(commentData);
    res.status(201).json(newComment);
  } catch (error) {
    next(error);
  }
};

export const getCommentsByPostId = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const queryParams = req.query;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const result = await getCommentsByPostIdService(postId, queryParams);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getCommentById = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({
        message: "commentId is required",
      });
    }

    const comment = await getCommentByIdService(commentId);
    res.status(200).json(comment);
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (req, res, next) => {
  try {
    const { commentId, userId } = req.params;
    const { comment } = req.body;

    if (!commentId || !userId) {
      return res.status(400).json({
        message: "commentId and userId are required",
      });
    }

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    if (comment.length > 1000) {
      return res.status(400).json({
        message: "Comment must be less than 1000 characters",
      });
    }

    const updateData = {
      comment: comment.trim()
    };

    const updatedComment = await updateCommentService(commentId, updateData, userId);
    res.status(200).json(updatedComment);
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({
        message: "commentId is required",
      });
    }

    const result = await deleteCommentService(commentId, req.user._id);
    res.status(200).json({
      message: "Comment deleted successfully",
      result
    });
  } catch (error) {
    next(error);
  }
};

export const getCommentsByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const queryParams = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const result = await getCommentsByUserIdService(userId, queryParams);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const likeComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({
        message: "commentId is required",
      });
    }

    const result = await likeCommentService(commentId, req.user._id);
    res.status(200).json({
      message: "Comment liked successfully",
      result
    });
  } catch (error) {
    next(error);
  }
};

export const unlikeComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({
        message: "commentId is required",
      });
    }

    const result = await unlikeCommentService(commentId, req.user._id);
    res.status(200).json({
      message: "Comment unliked successfully",
      result
    });
  } catch (error) {
    next(error);
  }
};

export const addReply = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { comment } = req.body;

    if (!commentId) {
      return res.status(400).json({
        message: "commentId is required",
      });
    }

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        message: "Reply content is required",
      });
    }

    if (comment.length > 500) {
      return res.status(400).json({
        message: "Reply must be less than 500 characters",
      });
    }

    const replyData = {
      comment: comment.trim(),
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email
    };

    const reply = await addReplyService(commentId, replyData);
    res.status(201).json(reply);
  } catch (error) {
    next(error);
  }
};

export const getCommentStats = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const stats = await getCommentStatsService(postId);
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};