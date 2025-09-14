import express from 'express';
import { 
  createStory, 
  getFriendsStories, 
  deleteStory, 
  getUserStories
} from '../controllers/storyController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createStory);

router.get('/friends', authMiddleware, getFriendsStories);

router.get('/user', authMiddleware, getUserStories);

router.delete('/:storyId', authMiddleware, deleteStory);

export default router;