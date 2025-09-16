import express from "express";
import {
  create,
  list,
  getById,
  update,
  remove,
  byUser,
  stats,
} from "../controllers/videoController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, create);

router.get("/", list);

router.get("/user", authMiddleware, byUser);

router.get("/:videoId", getById);

router.patch("/:videoId", authMiddleware, update);

router.delete("/:videoId", authMiddleware, remove);

router.get("/:videoId/stats", stats);

export default router;
