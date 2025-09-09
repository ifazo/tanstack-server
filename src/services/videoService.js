import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";
import { throwError } from "../utils/errorHandler.js";

const getVideoCollection = () => getDB().collection("videos");
const getCommentsCollection = () => getDB().collection("comments");

export const createVideo = async (videoData) => {
  const videos = getVideoCollection();
  const doc = { ...videoData, createdAt: new Date() };
  const result = await videos.insertOne(doc);
  if (!result.acknowledged) throwError(500, "Failed to create video");
  return { _id: result.insertedId, ...doc };
};

export const getAllVideos = async (queryParams = {}) => {
  const videos = getVideoCollection();
  const { search, skip = 0, limit = 10, sort = "desc", sortBy = "createdAt" } = queryParams;

  const q = {};
  if (search) {
    const rx = { $regex: String(search), $options: "i" };
    q.$or = [{ title: rx }, { description: rx }, { tags: rx }];
  }

  const total = await videos.countDocuments(q);
  let cursor = videos.find(q).skip(parseInt(skip, 10)).limit(parseInt(limit, 10));
  const dir = sort === "asc" ? 1 : -1;
  cursor = cursor.sort({ [sortBy]: dir });

  const data = await cursor.toArray();
  return {
    videos: data,
    total,
    currentPage: Math.floor(parseInt(skip, 10) / parseInt(limit, 10)) + 1,
    totalPages: Math.ceil(total / parseInt(limit, 10))
  };
};

export const getVideoById = async (videoId) => {
  if (!ObjectId.isValid(videoId)) throwError(400, "Invalid video ID format");
  const videos = getVideoCollection();
  const v = await videos.findOne({ _id: new ObjectId(videoId) });
  if (!v) throwError(404, "Video not found");
  return v;
};

export const updateVideo = async (videoId, updateData) => {
  if (!ObjectId.isValid(videoId)) throwError(400, "Invalid video ID format");
  const videos = getVideoCollection();
  updateData.updatedAt = new Date();
  const result = await videos.updateOne({ _id: new ObjectId(videoId) }, { $set: updateData });
  if (result.matchedCount === 0) throwError(404, "Video not found");
  return result;
};

export const deleteVideo = async (videoId) => {
  if (!ObjectId.isValid(videoId)) throwError(400, "Invalid video ID format");
  const videos = getVideoCollection();
  const result = await videos.deleteOne({ _id: new ObjectId(videoId) });
  if (result.deletedCount === 0) throwError(404, "Video not found");
  return result;
};

export const getVideosByUserId = async (userId, { skip = 0, limit = 20 } = {}) => {
  if (!ObjectId.isValid(userId)) throwError(400, "Invalid user ID format");
  const videos = getVideoCollection();
  const uid = new ObjectId(userId);
  const cursor = videos.find({ userId: uid }).sort({ createdAt: -1 }).skip(parseInt(skip, 10)).limit(parseInt(limit, 10));
  const data = await cursor.toArray();
  return data;
};

export const getVideoStats = async (videoId) => {
  if (!ObjectId.isValid(videoId)) throwError(400, "Invalid video ID format");
  const videos = getVideoCollection();
  const comments = getCommentsCollection();
  const oid = new ObjectId(videoId);

  const video = await videos.findOne({ _id: oid }, { projection: { views: 1, likes: 1 } });
  if (!video) throwError(404, "Video not found");

  const commentDocs = await comments.find({ $or: [{ videoId: oid }, { videoId }] }).sort({ createdAt: -1 }).toArray();

  return {
    videoId,
    views: video.views || 0,
    likes: video.likes || 0,
    commentsCount: commentDocs.length,
    comments: commentDocs
  };
};