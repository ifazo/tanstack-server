import express from 'express';
import { createToken, authenticateUser } from '../controllers/authController.js';

const router = express.Router();

router.post('/token', createToken);
router.post('/login', authenticateUser);

export default router;