import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getIncomingRequests,
  getSendingRequests,
  getSuggestions,
  listFriends,
  cancelFriendRequest
} from "../services/friendService.js";

export const checkFriendship = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { targetId } = req.query;
    if (!targetId) return res.status(400).json({ message: "targetId required" });

    const result = await isFriend({ userId, targetId });
    res.status(200).json({ isFriend: result });
  } catch (e) { next(e); }
};

export const sendRequest = async (req, res, next) => {
  try {
    const fromUserId = req.user?._id;
    const { toUserId } = req.query;
    if (!toUserId) return res.status(400).json({ message: "toUserId required" });
    const result = await sendFriendRequest({fromUserId, toUserId});
    res.status(201).json(result);
  } catch (e) { next(e); }
};

export const acceptRequest = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { requestId } = req.params;
    const result = await acceptFriendRequest({requestId, userId});
    res.status(200).json(result);
  } catch (e) { next(e); }
};

export const declineRequest = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { requestId } = req.params;
    const result = await declineFriendRequest({requestId, userId});
    res.status(200).json(result);
  } catch (e) { next(e); }
};

export const cancelRequest = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { requestId } = req.params;
    const result = await cancelFriendRequest({requestId, userId});
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

export const sentRequests = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const data = await getSendingRequests(userId);
    res.status(200).json(data);
  } catch (e) { next(e); }
};

export const suggestions = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const data = await getSuggestions(userId);
    res.status(200).json(data);
  } catch (e) { next(e); }
};
