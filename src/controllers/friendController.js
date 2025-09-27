import { ObjectId } from "mongodb";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getIncomingRequests,
  getSendingRequests,
  getSuggestions,
  listFriends,
  cancelFriendRequest,
} from "../services/friendService.js";

export const checkFriendship = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { targetId } = req.query;
    if (!targetId || !ObjectId.isValid(targetId))
      return res.status(400).json({ message: "targetId required" });

    const result = await isFriend({ userId, targetId });
    res.status(200).json({ isFriend: result });
  } catch (e) {
    next(e);
  }
};

export const sendRequest = async (req, res, next) => {
  try {
    const fromUserId = req.user?._id;
    const { toUserId } = req.query;
    if (
      !toUserId ||
      !ObjectId.isValid(toUserId) ||
      !fromUserId ||
      !ObjectId.isValid(fromUserId)
    )
      return res
        .status(400)
        .json({ message: "toUserId and fromUserId required" });

    const result = await sendFriendRequest({ fromUserId, toUserId });
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

export const acceptRequest = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { requestId } = req.params;

    if (
      !requestId ||
      !ObjectId.isValid(requestId) ||
      !userId ||
      !ObjectId.isValid(userId)
    ) {
      return res.status(400).json({
        message: "requestId and userId are required",
      });
    }

    const result = await acceptFriendRequest({ requestId, userId });
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
};

export const declineRequest = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { requestId } = req.params;

    if (
      !requestId ||
      !ObjectId.isValid(requestId) ||
      !userId ||
      !ObjectId.isValid(userId)
    ) {
      return res.status(400).json({
        message: "requestId and userId are required",
      });
    }

    const result = await declineFriendRequest({ requestId, userId });
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
};

export const cancelRequest = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { requestId } = req.params;

    if (
      !requestId ||
      !ObjectId.isValid(requestId) ||
      !userId ||
      !ObjectId.isValid(userId)
    ) {
      return res.status(400).json({
        message: "requestId and userId are required",
      });
    }
    const result = await cancelFriendRequest({ requestId, userId });
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
};

export const friendsList = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "userId is required",
      });
    }
    const data = await listFriends(userId);
    res.status(200).json(data);
  } catch (e) {
    next(e);
  }
};

export const incomingRequests = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "userId is required",
      });
    }
    const data = await getIncomingRequests(userId);
    res.status(200).json(data);
  } catch (e) {
    next(e);
  }
};

export const sentRequests = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "userId is required",
      });
    }
    const data = await getSendingRequests(userId);
    res.status(200).json(data);
  } catch (e) {
    next(e);
  }
};

export const suggestions = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "userId is required",
      });
    }
    const data = await getSuggestions(userId);
    res.status(200).json(data);
  } catch (e) {
    next(e);
  }
};
