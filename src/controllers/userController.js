import { ObjectId } from 'mongodb';
import { 
  findUserById as findUserByIdService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
  findUsers as findUsersService,
} from '../services/userService.js';

export const getUsers = async (req, res, next) => {
  try {
    const {q} = req.query;
    const users = await findUsersService({ q });
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
}

export const getUserById = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "userId is required and must be a valid id",
      });
    }

    const user = await findUserByIdService(userId);
    res.status(200).json(user);
  } catch (error) {
    
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const userData = req.body;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "userId is required and must be a valid id",
      });
    }

    if (!userData || Object.keys(userData).length === 0) {
      return res.status(400).json({
        message: "Update data is required",
      });
    }

    const result = await updateUserService({userId, userData});
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "userId is required and must be a valid id",
      });
    }

    const result = await deleteUserService(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};