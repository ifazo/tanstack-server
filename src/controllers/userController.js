import { 
  createUser as createUserService,
  getAllUsers as getAllUsersService,
  findUserById as findUserByIdService,
  updateUser as updateUserService,
  deleteUser as deleteUserService
} from '../services/userService.js';

export const createUser = async (req, res, next) => {
  try {
    const { name, image, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "email and password are required",
      });
    }

    const result = await createUserService({ name, image, email, password });
    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'User already exists') {
      return res.status(409).json({
        message: error.message,
      });
    }
    
    if (error.message === 'User not created') {
      return res.status(400).json({
        message: error.message,
      });
    }
    
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await getAllUsersService();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

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
    const { userId } = req.params;
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
    const { userId } = req.params;

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