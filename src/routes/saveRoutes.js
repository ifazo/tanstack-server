import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  addSave,
  removeSave,
  listUserSaves,
  checkSaved
} from '../controllers/saveController.js';

const router = express.Router();

router.get('/users/:userId', listUserSaves);

router.post('/posts/:postId', authMiddleware, addSave);

router.delete('/posts/:postId', authMiddleware, removeSave);

router.get('/posts/:postId/check', authMiddleware, checkSaved);

export default router;