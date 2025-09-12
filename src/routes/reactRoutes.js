import express from "express";
import {
  addReactToPost,
  removeReactFromPost,
  getUserReacts,
  checkPostReactByUser,
} from "../controllers/reactController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/posts/:postId", authMiddleware, checkPostReactByUser);

router.post("/posts/:postId", authMiddleware, addReactToPost);

router.delete("/posts/:postId", authMiddleware, removeReactFromPost);

router.get("/posts/user", authMiddleware, getUserReacts);

export default router;
