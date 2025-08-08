import express from 'express';
import { 
  addLikeToPost, 
  removeLikeFromPost,
  getPostLikes,
  checkUserLikedPost,
  getUserLikes,
  getPostLikeCount,
  getMostLikedPosts,
  getLikeStatistics,
  togglePostLike
} from '../controllers/likeController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/likes/trending - Get most liked posts
router.get('/trending', getMostLikedPosts);

// POST /api/likes/posts/:postId - Add like to post (protected)
router.post('/posts/:postId', authMiddleware, addLikeToPost);

// DELETE /api/likes/posts/:postId - Remove like from post (protected)
router.delete('/posts/:postId', authMiddleware, removeLikeFromPost);

// POST /api/likes/posts/:postId/toggle - Toggle like on post (protected)
router.post('/posts/:postId/toggle', authMiddleware, togglePostLike);

// GET /api/likes/posts/:postId - Get all likes for a post
router.get('/posts/:postId', getPostLikes);

// GET /api/likes/posts/:postId/count - Get like count for a post
router.get('/posts/:postId/count', getPostLikeCount);

// GET /api/likes/posts/:postId/check - Check if user liked post (protected)
router.get('/posts/:postId/check', authMiddleware, checkUserLikedPost);

// GET /api/likes/posts/:postId/stats - Get like statistics for a post
router.get('/posts/:postId/stats', getLikeStatistics);

// GET /api/likes/users/:userId - Get user's likes
router.get('/users/:userId', getUserLikes);

export default router;