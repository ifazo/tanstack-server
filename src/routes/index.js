import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import chatRoutes from './chatRoutes.js';
import postRoutes from './postRoutes.js';
import likeRoutes from './likeRoutes.js';
import commentRoutes from './commentRoutes.js';
import saveRoutes from './saveRoutes.js';

const router = express.Router();

router.get('/', (_req, res) => {
  res.status(200).json({ message: "Welcome to Tanstack Server!" });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/chats', chatRoutes);
router.use('/likes', likeRoutes);
router.use('/saves', saveRoutes);

export default router;