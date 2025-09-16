import express from "express";
import {
  addPostComment,
  getPostCommentsById,
  getCommentsByUserId,
  updatePostComment,
  deletePostComment,
} from "../controllers/commentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/user", authMiddleware, getCommentsByUserId);

router.post("/post/:postId", authMiddleware, addPostComment);

router.get("/post/:postId", getPostCommentsById);

router.patch("/:commentId", authMiddleware, updatePostComment);

router.delete("/:commentId", authMiddleware, deletePostComment);

export default router;
