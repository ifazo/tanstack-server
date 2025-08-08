import express from 'express';
import { 
  createPost, 
  getAllPosts, 
  getPostById,
  updatePost,
  deletePost,
  getPostsByUserId,
  searchPosts,
  getPostStats
} from '../controllers/postController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { ownerMiddleware } from '../middleware/ownerMiddleware.js';

const router = express.Router();

// POST /api/posts - Create a new post (protected)
router.post('/', authMiddleware, createPost);

// GET /api/posts - Get all posts with pagination and search
router.get('/', getAllPosts);

// GET /api/posts/search - Search posts
router.get('/search', searchPosts);

// GET /api/posts/user/:userId - Get posts by user ID
router.get('/user/:userId', getPostsByUserId);

// GET /api/posts/:postId - Get post by ID
router.get('/:postId', getPostById);

// GET /api/posts/:postId/stats - Get post statistics
router.get('/:postId/stats', getPostStats);

// PATCH /api/posts/:postId - Update post (owner only)
router.patch('/:postId', ownerMiddleware, updatePost);

// DELETE /api/posts/:postId - Delete post (owner only)
router.delete('/:postId', ownerMiddleware, deletePost);

export default router;