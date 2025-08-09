import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  addSave,
  removeSave,
  toggleSaveController,
  listUserSaves,
  checkSaved
} from '../controllers/saveController.js';

const router = express.Router();

// POST /api/saves/posts/:postId - save post
router.post('/posts/:postId', authMiddleware, addSave);

// DELETE /api/saves/posts/:postId - unsave post
router.delete('/posts/:postId', authMiddleware, removeSave);

// POST /api/saves/posts/:postId/toggle - toggle save
router.post('/posts/:postId/toggle', authMiddleware, toggleSaveController);

// GET /api/saves/posts/:postId/check - check if saved by current user
router.get('/posts/:postId/check', authMiddleware, checkSaved);

// GET /api/saves/users/:userId - list saved posts of user
router.get('/users/:userId', listUserSaves);

export default router;