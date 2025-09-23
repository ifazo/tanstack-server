import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import chatRoutes from './chatRoutes.js';
import postRoutes from './postRoutes.js';
import reactRoutes from './reactRoutes.js';
import commentRoutes from './commentRoutes.js';
import saveRoutes from './saveRoutes.js';
import friendRoutes from './friendRoutes.js';
import followRoutes from './followRoutes.js';
import storyRoutes from './storyRoutes.js';

const router = express.Router();

router.get('/', (_req, res) => {
  res.status(200).json({ message: "Welcome to Tanstack Server!" });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/chats', chatRoutes);
router.use('/reacts', reactRoutes);
router.use('/saves', saveRoutes);
router.use('/friends', friendRoutes);
router.use('/follows', followRoutes);
router.use('/stories', storyRoutes);

export default router;