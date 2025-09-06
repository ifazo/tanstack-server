import express from 'express';
import {
  openPersonalChat,
  createGroup,
  postMessage,
  getMessages,
  userChatList,
} from '../controllers/chatController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/personal', authMiddleware, openPersonalChat);

router.post('/group', authMiddleware, createGroup);

router.get('/user', authMiddleware, userChatList);

router.post('/:chatId/messages', authMiddleware, postMessage);

router.get('/:chatId/messages', authMiddleware, getMessages);

export default router;