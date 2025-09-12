import {
  addPostComment as addPostCommentService,
  getPostCommentsById as getPostCommentsByIdService,
  updatePostComment as updatePostCommentService,
  deletePostComment as deletePostCommentService,
  getCommentsByUserId as getCommentsByUserIdService,
} from "../services/commentService.js";

export const addPostComment = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { postId } = req.params;
    const { comment } = req.body;
    
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

    const commentData = {
      postId,
      userId,
      comment: comment.trim(),
    };

    const newComment = await addPostCommentService(commentData);
    res.status(201).json(newComment);
  } catch (error) {
    next(error);
  }
};

export const getPostCommentsById = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const result = await getPostCommentsByIdService(postId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updatePostComment = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { commentId } = req.params;
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

    const updateData = {
      userId,
      commentId,
      comment: comment.trim(),
    };

    const updatedComment = await updatePostCommentService(updateData);
    res.status(200).json(updatedComment);
  } catch (error) {
    next(error);
  }
};

export const deletePostComment = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { commentId } = req.params;

    if (!commentId || !userId) {
      return res.status(400).json({
        message: "commentId is required",
      });
    }

    const result = await deletePostCommentService(commentId, userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getCommentsByUserId = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const result = await getCommentsByUserIdService(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
