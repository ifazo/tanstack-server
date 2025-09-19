import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";
import { throwError } from "../utils/errorHandler.js";

const getUserCollection = () => getDB().collection("users");
const getPostCollection = () => getDB().collection("posts");
const getPostReactCollection = () => getDB().collection("post_reacts");
const getPostCommentCollection = () => getDB().collection("post_comments");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

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

export const getAllPosts = async (queryParams) => {
  const postCollection = getPostCollection();
  const userCollection = getUserCollection();
  const reactCollection = getPostReactCollection();
  const commentCollection = getPostCommentCollection();

  const {
    q,
    skip = 0,
    limit = 20,
    sort = "asc",
    sortBy = "createdAt",
  } = queryParams;

  const parsedSkip = parseInt(skip, 20);
  const parsedLimit = parseInt(limit, 20);
  const sortDirection = sort === "asc" ? 1 : -1;

  const query = {};
  if (q) {
    query.$or = [
      { text: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
    ];
  }

  const totalPosts = await postCollection.countDocuments(query);

  const posts = await postCollection
    .find(query)
    .skip(parsedSkip)
    .limit(parsedLimit)
    .sort({ [sortBy]: sortDirection })
    .toArray();

  const userIds = Array.from(
    new Set(posts.map((p) => p.userId && String(p.userId)).filter(Boolean))
  );
  if (userIds.length) {
    const userQueryIds = userIds.map((id) =>
      ObjectId.isValid(id) ? new ObjectId(id) : id
    );

    const users = await userCollection
      .find({ _id: { $in: userQueryIds } })
      .project({ name: 1, image: 1, username: 1 })
      .toArray();
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    
    posts.forEach((p) => {
      const u = userMap.get(String(p.userId));
      p.user = u
        ? {
            name: u.name || null,
            image: u.image || null,
            username: u.username || null,
          }
        : null;
    });
  } else posts.forEach((p) => (p.user = null));

  const postOids = posts.map((p) =>
    p._id instanceof ObjectId ? p._id : new ObjectId(p._id)
  );
  const postIdStrings = postOids.map((o) => String(o));

  const reactionsCountMap = new Map();
  const commentsCountMap = new Map();

  if (postOids.length) {
    const reactionsAgg = await reactCollection
      .aggregate([
        {
          $match: {
            $or: [
              { postId: { $in: postOids } },
              { postId: { $in: postIdStrings } },
            ],
          },
        },
        { $group: { _id: "$postId", count: { $sum: 1 } } },
      ])
      .toArray();
    reactionsAgg.forEach((r) => reactionsCountMap.set(String(r._id), r.count));

    const commentsAgg = await commentCollection
      .aggregate([
        {
          $match: {
            $or: [
              { postId: { $in: postOids } },
              { postId: { $in: postIdStrings } },
            ],
          },
        },
        { $group: { _id: "$postId", count: { $sum: 1 } } },
      ])
      .toArray();
    commentsAgg.forEach((r) => commentsCountMap.set(String(r._id), r.count));
  }

  posts.forEach((p) => {
    const pid = String(p._id);
    p.reactionsCount = reactionsCountMap.get(pid) || 0;
    p.commentsCount = commentsCountMap.get(pid) || 0;
  });

  const result = {
    posts,
    totalPosts,
    currentPage: Math.floor(parsedSkip / parsedLimit) + 1,
    totalPages: Math.ceil(totalPosts / parsedLimit),
    hasNextPage: parsedSkip + parsedLimit < totalPosts,
    hasPrevPage: parsedSkip > 0,
  };

  return result;
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
  const userCollection = getUserCollection();
  const reactCollection = getPostReactCollection();
  const commentCollection = getPostCommentCollection();

  const post = await postCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) {
    throwError(404, "Post not found");
  }

  let user = null;
  if (post.userId) {
    user = await userCollection.findOne(
      { _id: new ObjectId(post.userId) },
      { projection: { name: 1, image: 1, username: 1 } }
    );
  }

  post.user = user
    ? {
        name: user.name || null,
        image: user.image || null,
        username: user.username || null,
      }
    : null;

  const reacts = await reactCollection
    .find({ postId: new ObjectId(postId) })
    .project({ userId: 1, react: 1, createdAt: 1 })
    .toArray();

  const reactsCount = reacts.length;

  const comments = await commentCollection
    .find({ postId: new ObjectId(postId) })
    .sort({ createdAt: -1 })
    .toArray();

  const commentsCount = comments.length;

  return {
    ...post,
    reactsCount,
    reacts,
    commentsCount,
    comments,
  };
};

export const updatePost = async ({ postId, userId, text, images, mentions, tags }) => {
  const postCollection = getPostCollection();

  const updateData = {
    userId: toObjectId(userId),
    text,
    images,
    mentions: mentions.map(toObjectId),
    tags,
    updatedAt: new Date(),
  };

  const result = await postCollection.updateOne(
    { _id: new ObjectId(postId) },
    { $set: updateData }
  );

  if (result.modifiedCount === 0) {
    throwError(404, "Post not found or no changes made");
  }

  return result;
};

export const deletePost = async (postId) => {
  const postCollection = getPostCollection();

  const result = await postCollection.deleteOne({
    _id: new ObjectId(postId),
  });

  if (result.deletedCount === 0) {
    throwError(404, "Post not found");
  }

  return result;
};
