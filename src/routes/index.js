import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import chatRoutes from './chatRoutes.js';
import groupRoutes from './groupRoutes.js';
import postRoutes from './postRoutes.js';
import likeRoutes from './likeRoutes.js';
import commentRoutes from './commentRoutes.js';

const router = express.Router();

router.get('/', (_req, res) => {
  res.status(200).json({ message: "Tanstack Server API is running!" });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/chats', chatRoutes);
router.use('/groups', groupRoutes);
router.use('/posts', postRoutes);
router.use('/likes', likeRoutes);
router.use('/comments', commentRoutes);

export default router;