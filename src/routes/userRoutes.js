import express from 'express';
import { 
  createUser, 
  getAllUsers, 
  getUserById, 
  updateUser, 
  deleteUser 
} from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { ownerMiddleware } from '../middleware/ownerMiddleware.js';

const router = express.Router();

// POST /api/users - Create a new user
router.post('/', createUser);

// GET /api/users - Get all users (protected)
router.get('/', authMiddleware, getAllUsers);

// GET /api/users/:userId - Get user by ID (owner only)
router.get('/:userId', ownerMiddleware, getUserById);

// PATCH /api/users/:userId - Update user (owner only)
router.patch('/:userId', ownerMiddleware, updateUser);

// DELETE /api/users/:userId - Delete user (owner only)
router.delete('/:userId', ownerMiddleware, deleteUser);

export default router;