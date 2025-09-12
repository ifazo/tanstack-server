import express from 'express';
import { 
  createPost, 
  getAllPosts, 
  getPostById,
  updatePost,
  deletePost,
  getPostsByUserId,
} from '../controllers/postController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createPost);

router.get('/', getAllPosts);

router.get('/user', authMiddleware, getPostsByUserId);

router.get('/:postId', getPostById);

router.patch('/:postId', authMiddleware, updatePost);

router.delete('/:postId', authMiddleware, deletePost);

export default router;