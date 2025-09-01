import express from 'express';
import {
  openPersonalChat,
  createGroup,
  postMessage,
  getMessages,
  userChatList,
  addGroupParticipant,
  removeGroupParticipant,
  destroyChat
} from '../controllers/chatController.js';
import { ownerMiddleware } from '../middleware/ownerMiddleware.js';
import { decodeToken } from '../middleware/decodeToken.js';

const router = express.Router();

// Personal chat (open or get existing)
router.post('/personal/:userId/:otherUserId', ownerMiddleware, openPersonalChat);

// Group chat creation
router.post('/group', ownerMiddleware, createGroup);

// List chats for a user
router.get('/user/:userId', ownerMiddleware, userChatList);

// Post a message
router.post('/:chatId/messages', ownerMiddleware, postMessage);

// Get messages (with pagination)
router.get('/:chatId/messages', decodeToken, getMessages);

// Group participant management
router.post('/:chatId/participants', ownerMiddleware, addGroupParticipant);
router.delete('/:chatId/participants/:userId', ownerMiddleware, removeGroupParticipant);

// Delete chat (and its messages)
router.delete('/:chatId', ownerMiddleware, destroyChat);

export default router;