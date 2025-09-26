import { ObjectId } from "mongodb";
import { getDB } from "../config/database.js";
import { throwError } from "../utils/errorHandler.js";

const getFriendCollection = () => getDB().collection("friends");
const getUserCollection = () => getDB().collection("users");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const isFriend = async ({ userId, targetId }) => {
  const friendsCol = getFriendCollection();

  const uOid = toObjectId(userId);
  const tOid = toObjectId(targetId);

  const doc = await friendsCol.findOne({
    $or: [
      { from: uOid, to: tOid, status: "accepted" },
      { from: tOid, to: uOid, status: "accepted" },
    ],
  });
  return !!doc;
};

export const sendFriendRequest = async ({ fromUserId, toUserId }) => {
  if (String(fromUserId) === String(toUserId))
    throwError(400, "Cannot send request to yourself");

  const friendsCol = getFriendCollection();

  const fromOid = toObjectId(fromUserId);
  const toOid = toObjectId(toUserId);

  const accepted = await friendsCol.findOne({
    $or: [
      { from: fromOid, to: toOid, status: "accepted" },
      { from: toOid, to: fromOid, status: "accepted" },
    ],
  });
  if (accepted) throwError(409, "Already friends");

  const existing = await friendsCol.findOne({
    $or: [
      { from: fromOid, to: toOid, status: "pending" },
      { from: toOid, to: fromOid, status: "pending" },
    ],
  });
  if (existing) throwError(409, "Friend request already pending");

  const data = {
    from: fromOid,
    to: toOid,
    status: "pending",
    createdAt: new Date(),
  };

  const result = await friendsCol.insertOne(data);

  return result;
};

export const acceptFriendRequest = async ({ requestId, userId }) => {
  const friendsCol = getFriendCollection();

  const rOid = toObjectId(requestId);
  const uOid = toObjectId(userId);

  const reqDoc = await friendsCol.findOne({ _id: rOid });
  if (!reqDoc) throwError(404, "Request not found");
  if (!reqDoc.to || !reqDoc.to.equals(uOid))
    throwError(403, "Not allowed to accept");
  if (reqDoc.status === "accepted")
    return { message: "Already accepted", requestId };

  const result = await friendsCol.updateOne(
    { _id: rOid },
    { $set: { status: "accepted", acceptedAt: new Date() } }
  );

  return result;
};

export const declineFriendRequest = async ({ requestId, userId }) => {
  const friendsCol = getFriendCollection();

  const rOid = toObjectId(requestId);
  const uOid = toObjectId(userId);

  const reqDoc = await friendsCol.findOne({ _id: rOid });
  if (!reqDoc) throwError(404, "Request not found");
  if (!reqDoc.to || !reqDoc.to.equals(uOid))
    throwError(403, "Not allowed to decline");
  if (reqDoc.status === "declined")
    return { message: "Already declined", requestId };

  const result = await friendsCol.updateOne(
    { _id: rOid },
    { $set: { status: "declined", declinedAt: new Date() } }
  );

  return result;
};

export const cancelFriendRequest = async (requestId, actorId) => {
  const friendsCol = getFriendCollection();

  const rOid = toObjectId(requestId);
  const actorOid = toObjectId(actorId);

  const reqDoc = await friendsCol.findOne({ _id: rOid });
  if (!reqDoc) throwError(404, "Request not found");
  if (!reqDoc.from || !reqDoc.from.equals(actorOid))
    throwError(403, "Not allowed to cancel");
  if (reqDoc.status !== "pending")
    throwError(400, "Only pending requests can be cancelled");

  const result = await friendsCol.deleteOne({ _id: rOid });

  return result;
};

export const listFriends = async (userId) => {
  const friendsCol = getFriendCollection();

  const uOid = toObjectId(userId);

  const result = await friendsCol
    .aggregate([
      {
        $match: {
          status: "accepted",
          $or: [{ from: uOid }, { to: uOid }],
        },
      },
      {
        $addFields: {
          otherUserId: {
            $cond: [{ $eq: ["$from", uOid] }, "$to", "$from"],
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "otherUserId",
          foreignField: "_id",
          as: "otherUser",
        },
      },
      { $unwind: "$otherUser" },
      {
        $project: {
          _id: "$otherUser._id",
          name: "$otherUser.name",
          image: "$otherUser.image",
          username: "$otherUser.username",
          friendedAt: "$acceptedAt",
        },
      },
    ])
    .toArray();

  return result;
};

export const getIncomingRequests = async (userId) => {
  const friendsCol = getFriendCollection();

  const uOid = toObjectId(userId);

  const result = await friendsCol
    .aggregate([
      { $match: { to: uOid, status: "pending" } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "from",
          foreignField: "_id",
          as: "fromUser",
        },
      },
      { $unwind: "$fromUser" },
      {
        $project: {
          _id: 1,
          from: {
            _id: "$fromUser._id",
            name: "$fromUser.name",
            image: "$fromUser.image",
            username: "$fromUser.username",
          },
          createdAt: 1,
          // ⚠️ mutualFriends can’t be resolved inline unless you embed another $lookup/$facet
          // If findMutualFriends is expensive, keep it in app logic.
        },
      },
    ])
    .toArray();

  return result;
};

export const getSendingRequests = async (userId) => {
  const friendsCol = getFriendCollection();

  const uOid = toObjectId(userId);

  const result = await friendsCol
    .aggregate([
      { $match: { from: uOid, status: "pending" } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "to",
          foreignField: "_id",
          as: "toUser",
        },
      },
      { $unwind: "$toUser" },
      {
        $project: {
          _id: 1,
          to: {
            _id: "$toUser._id",
            name: "$toUser.name",
            image: "$toUser.image",
            username: "$toUser.username",
          },
          createdAt: 1,
        },
      },
    ])
    .toArray();

  return result;
};

export const getSuggestions = async (userId) => {
  const usersCol = getUserCollection();

  const uOid = toObjectId(userId);

  const result = await usersCol
    .aggregate([
      // Exclude self
      { $match: { _id: { $ne: uOid } } },

      // Lookup existing friendships between me and this user
      {
        $lookup: {
          from: "friends",
          let: { candidateId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $or: [{ $eq: ["$from", uOid] }, { $eq: ["$to", uOid] }] },
                    {
                      $or: [
                        { $eq: ["$from", "$$candidateId"] },
                        { $eq: ["$to", "$$candidateId"] },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "existingFriendship",
        },
      },

      // Exclude accepted/pending ones
      { $match: { existingFriendship: { $size: 0 } } },

      // Lookup my accepted friends
      {
        $lookup: {
          from: "friends",
          pipeline: [
            {
              $match: {
                status: "accepted",
                $or: [{ from: uOid }, { to: uOid }],
              },
            },
          ],
          as: "myFriends",
        },
      },

      // Lookup candidate’s accepted friends
      {
        $lookup: {
          from: "friends",
          let: { candidateId: "$_id" },
          pipeline: [
            {
              $match: {
                status: "accepted",
                $expr: {
                  $or: [
                    { $eq: ["$from", "$$candidateId"] },
                    { $eq: ["$to", "$$candidateId"] },
                  ],
                },
              },
            },
          ],
          as: "theirFriends",
        },
      },

      // Extract friend IDs
      {
        $addFields: {
          myFriendIds: {
            $map: {
              input: "$myFriends",
              as: "f",
              in: {
                $cond: [{ $eq: ["$$f.from", uOid] }, "$$f.to", "$$f.from"],
              },
            },
          },
          theirFriendIds: {
            $map: {
              input: "$theirFriends",
              as: "f",
              in: {
                $cond: [{ $eq: ["$$f.from", "$_id"] }, "$$f.to", "$$f.from"],
              },
            },
          },
        },
      },

      // Compute intersection
      {
        $addFields: {
          mutualIds: { $setIntersection: ["$myFriendIds", "$theirFriendIds"] },
        },
      },

      // Lookup mutual friend user docs
      {
        $lookup: {
          from: "users",
          localField: "mutualIds",
          foreignField: "_id",
          as: "mutualFriends",
        },
      },

      // Shape final output
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          username: 1,
          mutualFriends: { _id: 1, name: 1, image: 1, username: 1 },
        },
      },

      { $sort: { createdAt: 1 } },
      { $limit: 12 },
    ])
    .toArray();

  return result;
};
