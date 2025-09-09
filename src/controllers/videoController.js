import {
  createVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  getVideosByUserId,
  getVideoStats
} from "../services/videoService.js";

export const create = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { title, description = "", url, thumbnail = "", tags = [] } = req.body;
    if (!userId || !url || !title) return res.status(400).json({ message: "userId, title and url required" });
    const video = await createVideo({ userId: new Object(req.user._id), title, description, url, thumbnail, tags });
    res.status(201).json(video);
  } catch (e) { next(e); }
};

export const list = async (req, res, next) => {
  try {
    const data = await getAllVideos(req.query);
    res.status(200).json(data);
  } catch (e) { next(e); }
};

export const getById = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const vid = await getVideoById(videoId);
    res.status(200).json(vid);
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const result = await updateVideo(videoId, req.body);
    res.status(200).json(result);
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const result = await deleteVideo(videoId);
    res.status(200).json(result);
  } catch (e) { next(e); }
};

export const byUser = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const data = await getVideosByUserId(userId, req.query);
    res.status(200).json(data);
  } catch (e) { next(e); }
};

export const stats = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const data = await getVideoStats(videoId);
    res.status(200).json(data);
  } catch (e) { next(e); }
};