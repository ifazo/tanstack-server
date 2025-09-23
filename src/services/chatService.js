import { ObjectId } from "mongodb";
import { getDB } from "../config/database.js";
import { throwError } from "../utils/errorHandler.js";

const getChatCollection = () => getDB().collection("chats");
const getMessageCollection = () => getDB().collection("messages");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const createPersonalChat = async ({ userId, receiverId }) => {
  const chats = getChatCollection();
  const p1 = toObjectId(userId);
  const p2 = toObjectId(receiverId);

  const existing = await chats.findOne({
    type: "personal",
    participants: { $all: [p1, p2], $size: 2 },
  });
  if (existing) return existing;

  const data = {
    type: "personal",
    participants: [p1, p2],
    createdAt: new Date(),
    lastMessage: null,
  };
  const result = await chats.insertOne(data);
  return result;
};

export const createGroupChat = async ({
  userId,
  name,
  image,
  participantIds = [],
}) => {
  const chats = getChatCollection();
  const now = new Date();
  const participants = [...new Set([userId, ...participantIds])].map(
    toObjectId
  );
  const data = {
    type: "group",
    name: name?.trim(),
    image: image || null,
    createdBy: toObjectId(userId),
    admins: [toObjectId(userId)],
    participants,
    createdAt: now,
    lastMessage: null,
  };
  const result = await chats.insertOne(data);
  return result;
};

export const addMessage = async ({ chatId, userId, text }) => {
  const chats = getChatCollection();
  const messages = getMessageCollection();

  const cId = toObjectId(chatId);
  const uId = toObjectId(userId);

  const chat = await chats.findOne({ _id: cId });
  if (!chat) throwError(404, "Chat not found");
  if (!chat.participants.some((p) => p.equals(uId)))
    throwError(403, "Not a participant");

  const now = new Date();

  const data = {
    chatId: cId,
    userId: uId,
    text,
    createdAt: now,
  };

  const result = await messages.insertOne(data);

  await chats.updateOne(
    { _id: cId },
    {
      $set: {
        lastMessageId: result.insertedId,
        updatedAt: now,
      },
    }
  );

  return result;
};

export const getUserChats = async (userId) => {
  const chats = getChatCollection();
  const uId = toObjectId(userId);

  const result = await chats.aggregate([
    // Find chats where user is a participant
    { $match: { participants: uId } },
    { $sort: { updatedAt: -1 } },

    // Lookup lastMessage
    {
      $lookup: {
        from: "messages",
        localField: "lastMessageId",
        foreignField: "_id",
        as: "lastMessage"
      }
    },
    { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },

    // Lookup users (for personal chats)
    {
      $lookup: {
        from: "users",
        let: { participants: "$participants" },
        pipeline: [
          { $match: { $expr: { $in: ["$_id", "$$participants"] } } },
          { $project: { name: 1, image: 1 } }
        ],
        as: "users"
      }
    },

    // Transform final shape
    {
      $addFields: {
        // For group chats, keep stored name/image
        name: {
          $cond: [
            { $eq: ["$type", "group"] },
            "$name",
            {
              // For personal, pick the "other" user’s name
              $let: {
                vars: {
                  other: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$users",
                          cond: { $ne: ["$$this._id", uId] }
                        }
                      },
                      0
                    ]
                  }
                },
                in: "$$other.name"
              }
            }
          ]
        },
        image: {
          $cond: [
            { $eq: ["$type", "group"] },
            "$image",
            {
              $let: {
                vars: {
                  other: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$users",
                          cond: { $ne: ["$$this._id", uId] }
                        }
                      },
                      0
                    ]
                  }
                },
                in: "$$other.image"
              }
            }
          ]
        }
      }
    },

    // Only include what you need
    {
      $project: {
        participants: 1,
        type: 1,
        updatedAt: 1,
        lastMessage: 1,
        name: 1,
        image: 1
      }
    }
  ]).toArray();

  return result;
};

export const getChatMessages = async ({ chatId, userId }) => {
  const chats = getChatCollection();
  const cId = toObjectId(chatId);
  const uId = toObjectId(userId);

  const result = await chats.aggregate([
    { $match: { _id: cId } },
    {
      $match: {
        participants: uId // validate participant in pipeline
      }
    },
    {
      $lookup: {
        from: "messages",
        localField: "_id",
        foreignField: "chatId",
        as: "messages"
      }
    },
    { $unwind: { path: "$messages", preserveNullAndEmptyArrays: true } },
    { $sort: { "messages.createdAt": -1 } },
    {
      $group: {
        _id: "$_id",
        type: { $first: "$type" },
        participants: { $first: "$participants" },
        name: { $first: "$name" },
        image: { $first: "$image" },
        messages: { $push: "$messages" }
      }
    },
    {
      $lookup: {
        from: "users",
        let: { participants: "$participants" },
        pipeline: [
          { $match: { $expr: { $in: ["$_id", "$$participants"] } } },
          { $project: { name: 1, image: 1 } }
        ],
        as: "users"
      }
    }
  ]).toArray();

  if (!result.length) throwError(404, "Chat not found or not a participant");

  const chat = result[0];
  let name = chat.type === "group" ? chat.name : null;
  let image = chat.type === "group" ? chat.image : null;

  if (chat.type === "personal") {
    const other = chat.users.find(u => !u._id.equals(uId));
    name = other?.name || null;
    image = other?.image || null;
  }

  return {
    _id: chat._id,
    type: chat.type,
    name,
    image,
    messages: chat.messages
  };
};
