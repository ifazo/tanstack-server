import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  getFollowSuggestions
} from "../services/followService.js";

export const follow = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { targetId } = req.query;
    if (!targetId) return res.status(400).json({ message: "targetId required" });
    const result = await followUser(userId, targetId);
    res.status(result.followed ? 201 : 200).json(result);
  } catch (e) { next(e); }
};

export const unfollow = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { targetId } = req.query;
    if (!targetId) return res.status(400).json({ message: "targetId required" });
    const result = await unfollowUser(userId, targetId);
    res.status(200).json(result);
  } catch (e) { next(e); }
};

export const checkFollowing = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { targetId } = req.query;
    const following = await isFollowing(userId, targetId);
    res.status(200).json({ following });
  } catch (e) { next(e); }
};

export const followers = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { skip, limit } = req.query;
    const data = await getFollowers(userId, { skip, limit });
    res.status(200).json(data);
  } catch (e) { next(e); }
};

export const following = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { skip, limit } = req.query;
    const data = await getFollowing(userId, { skip, limit });
    res.status(200).json(data);
  } catch (e) { next(e); }
};

export const suggestions = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { limit } = req.query;
    const data = await getFollowSuggestions(userId, limit || 10);
    res.status(200).json(data);
  } catch (e) { next(e); }
};