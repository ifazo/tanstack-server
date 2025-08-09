import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import chatRoutes from './chatRoutes.js';
import groupRoutes from './groupRoutes.js';
import postRoutes from './postRoutes.js';
import likeRoutes from './likeRoutes.js';
import commentRoutes from './commentRoutes.js';
import saveRoutes from './saveRoutes.js';

const router = express.Router();

router.get('/', (_req, res) => {
  res.status(200).send("Welcome to Tanstack Server!");
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/chats', chatRoutes);
router.use('/groups', groupRoutes);
router.use('/posts', postRoutes);
router.use('/likes', likeRoutes);
router.use('/comments', commentRoutes);
router.use('/saves', saveRoutes);

export default router;