import express from 'express';
import { 
  createPost, 
  getAllPosts, 
  getPostById,
  updatePost,
  deletePost,
  getPostsByUserId,
  getPostStats
} from '../controllers/postController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createPost);

router.get('/', getAllPosts);

router.get('/user', authMiddleware, getPostsByUserId);

router.get('/:postId', getPostById);

router.patch('/:postId', authMiddleware, updatePost);

router.delete('/:postId', authMiddleware, deletePost);

router.get('/:postId/stats', getPostStats);

export default router;