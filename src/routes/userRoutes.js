import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  updateUser, 
  deleteUser 
} from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { ownerMiddleware } from '../middleware/ownerMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getAllUsers);

router.get('/:userId', ownerMiddleware, getUserById);

router.patch('/:userId', ownerMiddleware, updateUser);

router.delete('/:userId', ownerMiddleware, deleteUser);

export default router;