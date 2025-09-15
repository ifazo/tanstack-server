import express from "express";
import {
  sendRequest,
  acceptRequest,
  declineRequest,
  incomingRequests,
  sentRequests,
  suggestions,
  friendsList,
  cancelRequest
} from "../controllers/friendController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/requests", authMiddleware, sendRequest);
router.post("/requests/:requestId/accept", authMiddleware, acceptRequest);
router.post("/requests/:requestId/decline", authMiddleware, declineRequest);
router.delete("/requests/:requestId", authMiddleware, cancelRequest);
router.get("/requests", authMiddleware, incomingRequests);
router.get("/requests/sent", authMiddleware, sentRequests);
router.get("/suggestions", authMiddleware, suggestions);
router.get("/", authMiddleware, friendsList);

export default router;