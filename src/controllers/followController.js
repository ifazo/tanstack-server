import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
} from "../services/followService.js";

export const follow = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { targetId } = req.query;
    if (!targetId) return res.status(400).json({ message: "targetId required" });
    const result = await followUser({userId, targetId});
    res.status(result.followed ? 201 : 200).json(result);
  } catch (e) { next(e); }
};

export const unfollow = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { targetId } = req.query;
    if (!targetId) return res.status(400).json({ message: "targetId required" });
    const result = await unfollowUser({userId, targetId});
    res.status(200).json(result);
  } catch (e) { next(e); }
};

export const checkFollowing = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { targetId } = req.query;
    const result = await isFollowing({userId, targetId});
    res.status(200).json({ following: result });
  } catch (e) { next(e); }
};

export const followers = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const data = await getFollowers(userId);
    res.status(200).json(data);
  } catch (e) { next(e); }
};

export const following = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const data = await getFollowing(userId);
    res.status(200).json(data);
  } catch (e) { next(e); }
};
