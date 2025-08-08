import express from 'express';
import { 
  createGroup, 
  getAllGroups, 
  getGroupById,
  getGroupChatMessages,
  addMessageToGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  updateGroup,
  deleteGroup,
} from '../controllers/groupController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { ownerMiddleware } from '../middleware/ownerMiddleware.js';

const router = express.Router();

// POST /api/groups - Create a new group
router.post('/', authMiddleware, createGroup);

// GET /api/groups - Get all groups (protected)
router.get('/', authMiddleware, getAllGroups);

// GET /api/groups/:groupId - Get group by ID (protected)
router.get('/:groupId', authMiddleware, getGroupById);

// PUT /api/groups/:groupId - Update group (owner/admin only)
router.put('/:groupId', ownerMiddleware, updateGroup);

// DELETE /api/groups/:groupId - Delete group (owner/admin only)
router.delete('/:groupId', ownerMiddleware, deleteGroup);

// POST /api/groups/:groupId/members - Add member to group
router.post('/:groupId/members', authMiddleware, addMemberToGroup);

// DELETE /api/groups/:groupId/members/:userId - Remove member from group
router.delete('/:groupId/members/:userId', ownerMiddleware, removeMemberFromGroup);

// GET /api/chats/group/:groupId - Get group chat messages
router.get('/:groupId/conversations', authMiddleware, getGroupChatMessages);

// POST /api/chats/group/:groupId/conversations/:userId - Add message to group chat
router.post('/:groupId/conversations/:userId', authMiddleware, addMessageToGroup);

export default router;