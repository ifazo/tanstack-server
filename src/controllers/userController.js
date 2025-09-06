import { 
  findUserById as findUserByIdService,
  updateUser as updateUserService,
  deleteUser as deleteUserService
} from '../services/userService.js';

export const getUserById = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const user = await findUserByIdService(userId);
    res.status(200).json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        message: error.message,
      });
    }
    
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const userData = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    if (!userData || Object.keys(userData).length === 0) {
      return res.status(400).json({
        message: "Update data is required",
      });
    }

    const result = await updateUserService(userId, userData);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'User not found or updated') {
      return res.status(404).json({
        message: error.message,
      });
    }
    
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const result = await deleteUserService(userId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'User not found or deleted') {
      return res.status(404).json({
        message: error.message,
      });
    }
    
    next(error);
  }
};