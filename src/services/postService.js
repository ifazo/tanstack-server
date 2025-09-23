import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";
import { throwError } from "../utils/errorHandler.js";

const getPostCollection = () => getDB().collection("posts");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const getAllPosts = async (queryParams) => {
  const postCollection = getPostCollection();
  const {
    q,
    skip = 0,
    limit = 20,
    sort = "asc",
    sortBy = "createdAt",
  } = queryParams;

  const parsedSkip = parseInt(skip, 10);
  const parsedLimit = parseInt(limit, 10);
  const sortDirection = sort === "asc" ? 1 : -1;

  const query = {};
  if (q) {
    query.$or = [
      { text: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
    ];
  }

  const pipeline = [
    { $match: query },
    { $sort: { [sortBy]: sortDirection } },
    { $skip: parsedSkip },
    { $limit: parsedLimit },

    // join user info
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        text: 1,
        tags: 1,
        createdAt: 1,
        updatedAt: 1,
        "user._id": 1,
        "user.name": 1,
        "user.image": 1,
        "user.username": 1,
      },
    },

    // reactions count
    {
      $lookup: {
        from: "post_reacts",
        let: { pid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$postId", "$$pid"] } } },
          { $count: "count" },
        ],
        as: "reactionsCount",
      },
    },
    {
      $addFields: {
        reactionsCount: {
          $ifNull: [{ $arrayElemAt: ["$reactionsCount.count", 0] }, 0],
        },
      },
    },

    // comments count
    {
      $lookup: {
        from: "post_comments",
        let: { pid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$postId", "$$pid"] } } },
          { $count: "count" },
        ],
        as: "commentsCount",
      },
    },
    {
      $addFields: {
        commentsCount: {
          $ifNull: [{ $arrayElemAt: ["$commentsCount.count", 0] }, 0],
        },
      },
    },
  ];

  const posts = await postCollection.aggregate(pipeline).toArray();

  const totalPosts = await postCollection.countDocuments(query);

  return {
    posts,
    totalPosts,
    currentPage: Math.floor(parsedSkip / parsedLimit) + 1,
    totalPages: Math.ceil(totalPosts / parsedLimit),
  };
};

export const getPostsByUserId = async (userId) => {
  const postCollection = getPostCollection();

  const result = await postCollection
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray();

  return result;
};

export const getPostById = async (postId) => {
  const postCollection = getPostCollection();
  const objectId = new ObjectId(postId);

  const pipeline = [
    { $match: { _id: objectId } },

    // join user
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        user: {
          _id: "$user._id",
          name: "$user.name",
          image: "$user.image",
          username: "$user.username",
        },
      },
    },

    // get reacts
    {
      $lookup: {
        from: "post_reacts",
        let: { pid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$postId", "$$pid"] } } },
          { $project: { userId: 1, react: 1, createdAt: 1 } },
        ],
        as: "reacts",
      },
    },
    {
      $addFields: {
        reactsCount: { $size: "$reacts" },
      },
    },

    // get comments
    {
      $lookup: {
        from: "post_comments",
        let: { pid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$postId", "$$pid"] } } },
          { $sort: { createdAt: -1 } },
        ],
        as: "comments",
      },
    },
    {
      $addFields: {
        commentsCount: { $size: "$comments" },
      },
    },
  ];

  const post = await postCollection.aggregate(pipeline).next();
  if (!post) {
    throwError(404, "Post not found");
  }

  return post;
};

export const createPost = async ({ userId, text, images, mentions, tags }) => {
  const postCollection = getPostCollection();

  const post = {
    userId: toObjectId(userId),
    text,
    images,
    mentions: mentions.map(toObjectId),
    tags,
    createdAt: new Date(),
  };

  const result = await postCollection.insertOne(post);

  if (!result.acknowledged) {
    throwError(500, "Failed to create post");
  }

  return {
    _id: result.insertedId,
    ...post,
  };
};

export const updatePost = async ({
  postId,
  userId,
  text,
  images,
  mentions,
  tags,
}) => {
  const postCollection = getPostCollection();

  const updateData = {
    text,
    images,
    mentions: mentions.map(toObjectId),
    tags,
    updatedAt: new Date(),
  };

  const result = await postCollection.updateOne(
    { _id: new ObjectId(postId), userId: toObjectId(userId) },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throwError(403, "Not authorized or post not found");
  }

  if (result.modifiedCount === 0) {
    throwError(400, "No changes made");
  }

  return { _id: postId, userId, ...updateData };
};

export const deletePost = async (postId) => {
  const postCollection = getPostCollection();

  const result = await postCollection.deleteOne({
    _id: new ObjectId(postId),
  });

  if (result.deletedCount !== 1) {
    throwError(404, "Post not found");
  }

  return result;
};
