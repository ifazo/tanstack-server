import express from "express";
import {
  sendRequest,
  acceptRequest,
  declineRequest,
  incomingRequests,
  suggestions,
  friendsList
} from "../controllers/friendController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/requests", authMiddleware, sendRequest);
router.post("/requests/:requestId/accept", authMiddleware, acceptRequest);
router.post("/requests/:requestId/decline", authMiddleware, declineRequest);
router.get("/requests", authMiddleware, incomingRequests);
router.get("/suggestions", authMiddleware, suggestions);
router.get("/", authMiddleware, friendsList);

export default router;