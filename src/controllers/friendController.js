import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getIncomingRequests,
  getSuggestions,
  listFriends
} from "../services/friendService.js";

export const sendRequest = async (req, res, next) => {
  try {
    const fromUserId = req.user?._id;
    const { toUserId } = req.query;
    if (!toUserId) return res.status(400).json({ message: "toUserId required" });
    const result = await sendFriendRequest(fromUserId, toUserId);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

export const acceptRequest = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { requestId } = req.params;
    const result = await acceptFriendRequest(requestId, userId);
    res.status(200).json(result);
  } catch (e) { next(e); }
};

export const declineRequest = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { requestId } = req.params;
    const result = await declineFriendRequest(requestId, userId);
    res.status(200).json(result);
  } catch (e) { next(e); }
};

export const friendsList = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const data = await listFriends(userId);
    res.status(200).json(data);
  } catch (e) { next(e); }
};

export const incomingRequests = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const data = await getIncomingRequests(userId);
    res.status(200).json(data);
  } catch (e) { next(e); }
};

export const suggestions = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { limit } = req.query;
    const data = await getSuggestions(userId, limit || 10);
    res.status(200).json(data);
  } catch (e) { next(e); }
};
