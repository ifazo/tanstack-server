import express from "express";
import {
  follow,
  unfollow,
  checkFollowing,
  followers,
  following,
  suggestions,
} from "../controllers/followController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/accept", authMiddleware, follow);

router.post("/decline", authMiddleware, unfollow);

router.get("/check", authMiddleware, checkFollowing);

router.get("/followers", authMiddleware, followers);

router.get("/following", authMiddleware, following);

router.get("/suggestions", authMiddleware, suggestions);

export default router;
