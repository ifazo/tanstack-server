import express from 'express';
import { authenticateUser, createUser } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', authenticateUser);

router.post('/signup', createUser);

export default router;