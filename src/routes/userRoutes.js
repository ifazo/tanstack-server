import express from "express";
import {
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getUserById);

router.patch("/", authMiddleware, updateUser);

router.delete("/", authMiddleware, deleteUser);

export default router;
