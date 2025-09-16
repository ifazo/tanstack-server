import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  addSave,
  removeSave,
  listUserSaves,
  checkSaved
} from '../controllers/saveController.js';

const router = express.Router();

router.get('/user', authMiddleware, listUserSaves);

router.post('/posts/:postId', authMiddleware, addSave);

router.delete('/posts/:postId', authMiddleware, removeSave);

router.get('/posts/:postId', authMiddleware, checkSaved);

export default router;