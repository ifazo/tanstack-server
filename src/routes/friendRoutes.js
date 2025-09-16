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

router.get("/", authMiddleware, friendsList);

router.post("/requests", authMiddleware, sendRequest);

router.get("/requests", authMiddleware, incomingRequests);

router.get("/requests/sent", authMiddleware, sentRequests);

router.get("/suggestions", authMiddleware, suggestions);

router.delete("/requests/:requestId", authMiddleware, cancelRequest);

router.post("/requests/:requestId/accept", authMiddleware, acceptRequest);

router.post("/requests/:requestId/decline", authMiddleware, declineRequest);

export default router;