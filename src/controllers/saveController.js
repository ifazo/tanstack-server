import {
  savePost,
  unsavePost,
  toggleSave,
  getUserSavedPosts,
  isPostSavedByUser
} from '../services/saveService.js';

export const addSave = async (req, res, next) => {
  try {
    const { postId, userId } = req.params;
    if (!postId || !userId) return res.status(400).json({ message: 'postId and userId are required' });
    const result = await savePost(postId, userId);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

export const removeSave = async (req, res, next) => {
  try {
    const { postId, userId } = req.params;
    if (!postId || !userId) return res.status(400).json({ message: 'postId and userId are required' });
    const result = await unsavePost(postId, userId);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
};

export const toggleSaveController = async (req, res, next) => {
  try {
    const { postId, userId } = req.params;
    if (!postId || !userId) return res.status(400).json({ message: 'postId and userId are required' });
    const result = await toggleSave(postId, userId);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
};

export const listUserSaves = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const result = await getUserSavedPosts(userId, req.query);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
};

export const checkSaved = async (req, res, next) => {
  try {
    const { postId, userId } = req.params;
    if (!postId || !userId) return res.status(400).json({ message: 'postId and userId are required' });
    const result = await isPostSavedByUser(postId, userId);
    res.status(200).json(result);
  } catch (e) {
    if (e.message === 'Invalid post ID') return res.status(400).json({ message: e.message });
    next(e);
  }
};