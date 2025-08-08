import express from 'express';
import { 
  getUserChatOverview, 
  addMessageToPersonalChat, 
  getConversationMessages, 
  deleteConversation 
} from '../controllers/chatController.js';
import { ownerMiddleware } from '../middleware/ownerMiddleware.js';

const router = express.Router();

// GET /api/chats/conversations/:userId - Get user chat overview
router.get('/:userId/conversations', ownerMiddleware, getUserChatOverview);

// POST /api/chats/:userId/conversations/:receiverId - Add message to personal chat
router.post('/:userId/conversations/:receiverId', ownerMiddleware, addMessageToPersonalChat);

// GET /api/chats/:userId/conversations/:receiverId - Get conversation messages
router.get('/:userId/conversations/:receiverId', ownerMiddleware, getConversationMessages);

// DELETE /api/chats/:userId/conversations/:receiverId - Delete conversation
router.delete('/:userId/conversations/:receiverId', ownerMiddleware, deleteConversation);

export default router;