import express from 'express';
import {
  openPersonalChat,
  createGroup,
  postMessage,
  getMessages,
  seeMessages,
  listUserChats,
  addGroupParticipant,
  removeGroupParticipant,
  destroyChat
} from '../controllers/chatController.js';
import { ownerMiddleware } from '../middleware/ownerMiddleware.js';

const router = express.Router();

// Personal chat (open or get existing)
router.post('/personal/:userId/:otherUserId', ownerMiddleware, openPersonalChat);

// Group chat creation
router.post('/group', ownerMiddleware, createGroup);

// List chats for a user
router.get('/user/:userId', ownerMiddleware, listUserChats);

// Post a message
router.post('/:chatId/messages', ownerMiddleware, postMessage);

// Get messages (with pagination)
router.get('/:chatId/messages', ownerMiddleware, getMessages);

// Mark messages seen
router.patch('/:chatId/seen', ownerMiddleware, seeMessages);

// Group participant management
router.post('/:chatId/participants', ownerMiddleware, addGroupParticipant);
router.delete('/:chatId/participants/:userId', ownerMiddleware, removeGroupParticipant);

// Delete chat (and its messages)
router.delete('/:chatId', ownerMiddleware, destroyChat);

export default router;