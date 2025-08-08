import express from 'express';
import { 
  addComment, 
  getCommentsByPostId,
  getCommentById,
  updateComment,
  deleteComment,
  getCommentsByUserId,
  likeComment,
  unlikeComment,
  addReply,
  getCommentStats
} from '../controllers/commentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/comments - Add a new comment (protected)
router.post('/', authMiddleware, addComment);

// GET /api/comments/post/:postId - Get comments by post ID
router.get('/post/:postId', getCommentsByPostId);

// GET /api/comments/post/:postId/stats - Get comment statistics for a post
router.get('/post/:postId/stats', getCommentStats);

// GET /api/comments/user/:userId - Get comments by user ID
router.get('/user/:userId', getCommentsByUserId);

// GET /api/comments/:commentId - Get comment by ID
router.get('/:commentId', getCommentById);

// PATCH /api/comments/:commentId - Update comment (owner only)
router.patch('/:commentId', authMiddleware, updateComment);

// DELETE /api/comments/:commentId - Delete comment (owner only)
router.delete('/:commentId', authMiddleware, deleteComment);

// POST /api/comments/:commentId/like - Like a comment (protected)
router.post('/:commentId/like', authMiddleware, likeComment);

// DELETE /api/comments/:commentId/like - Unlike a comment (protected)
router.delete('/:commentId/like', authMiddleware, unlikeComment);

// POST /api/comments/:commentId/replies - Add a reply to a comment (protected)
router.post('/:commentId/replies', authMiddleware, addReply);

export default router;