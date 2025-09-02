import { ObjectId } from "mongodb";
import { getDB } from "../config/database.js";

const getChatCollection = () => getDB().collection("chats");
const getMessageCollection = () => getDB().collection("messages");
const getUserCollection = () => getDB().collection("users");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const createGroupChat = async ({
  name,
  image = null,
  createdBy,
  participantIds = [],
}) => {
  const chats = getChatCollection();
  const now = new Date();
  const participants = [...new Set([createdBy, ...participantIds])].map(
    toObjectId
  );
  const doc = {
    type: "group",
    name: name?.trim(),
    image: image || null,
    createdBy: toObjectId(createdBy),
    admins: [toObjectId(createdBy)],
    participants,
    createdAt: now,
    lastMessage: null,
  };
  const result = await chats.insertOne(doc);
  return { _id: result.insertedId, ...doc };
};

export const getOrCreatePersonalChat = async (userId, receiverId) => {
  const chats = getChatCollection();
  const p1 = toObjectId(userId);
  const p2 = toObjectId(receiverId);

  let chat = await chats.findOne({
    type: "personal",
    participants: { $all: [p1, p2], $size: 2 },
  });

  if (chat) return chat;

  const now = new Date();
  const doc = {
    type: "personal",
    participants: [p1, p2],
    createdAt: now,
    lastMessage: null,
  };
  const result = await chats.insertOne(doc);
  return { _id: result.insertedId, ...doc };
};

export const addMessage = async ({
  chatId,
  senderId,
  text,
  attachments = [],
}) => {
  const chats = getChatCollection();
  const messages = getMessageCollection();

  const cId = toObjectId(chatId);
  const sId = toObjectId(senderId);

  const chat = await chats.findOne({ _id: cId });
  if (!chat) throw new Error("Chat not found");
  if (!chat.participants.some((p) => p.equals(sId)))
    throw new Error("Not a participant");

  const now = new Date();
  const msgDoc = {
    chatId: cId,
    senderId: sId,
    text,
    attachments,
    createdAt: now,
  };

  const result = await messages.insertOne(msgDoc);

  await chats.updateOne(
    { _id: cId },
    {
      $set: {
        lastMessage: {
          senderId: sId,
          text: msgDoc.text,
          createdAt: now,
        },
      },
    }
  );

  return { _id: result.insertedId, ...msgDoc };
};

export const getChatMessages = async (
  chatId,
  userId,
  { skip = 0, limit = 50, sort = "asc" } = {}
) => {
  const chats = getChatCollection();
  const messages = getMessageCollection();
  const users = getUserCollection();

  const cId = toObjectId(chatId);
  const uId = toObjectId(userId);

  const chat = await chats.findOne({ _id: cId });
  if (!chat) throw new Error("Chat not found");
  if (!chat.participants?.some((p) => p.equals(uId))) {
    const e = new Error("Not a participant");
    e.status = 403;
    throw e;
  }

  let name = null;
  let image = null;
  if (chat.type === "group") {
    name = chat.name || "Group";
    image = chat.image || null;
  } else {
    const otherId = (chat.participants || []).find((p) => !p.equals(vId));
    if (otherId) {
      const other = await users.findOne(
        { _id: otherId },
        { projection: { name: 1, image: 1 } }
      );
      name = other?.name || "Unknown User";
      image = other?.image || null;
    }
  }

  const direction = sort === "desc" ? -1 : 1;

  const cursor = messages
    .find({ chatId: cId })
    .sort({ createdAt: direction })
    .skip(parseInt(skip, 10))
    .limit(parseInt(limit, 10));

  const data = await cursor.toArray();
  const total = await messages.countDocuments({ chatId: cId });

  return {
    _id: chat._id,
    type: chat.type,
    name,
    image,
    messages: data,
    total,
    skip: Number(skip),
    limit: Number(limit)
  };
};

export const getUserChats = async (userId) => {
  const chats = getChatCollection();
  const users = getUserCollection();
  const uId = toObjectId(userId);

  // 1) Load all chats for user
  const list = await chats
    .find({ participants: uId })
    .sort({ "lastMessage.createdAt": -1, createdAt: -1 })
    .toArray();

  // 2) Collect "other user" ids for personal chats
  const otherIds = new Set(
    list
      .filter((c) => c.type === "personal")
      .map((c) => (c.participants || []).find((p) => !p.equals(uId)))
      .filter(Boolean) // remove undefined
      .map((oid) => oid.toString())
  );

  // 3) Load those users in one query
  const otherUsers = await users
    .find({ _id: { $in: Array.from(otherIds).map((id) => new ObjectId(id)) } })
    .project({ name: 1, image: 1 }) // adjust field names if needed
    .toArray();

  const otherMap = new Map(otherUsers.map((u) => [u._id.toString(), u]));

  // 4) Map chats: dynamic name/image for personal, stored for group
  const mapped = list.map((chat) => {
    if (chat.type === "group") {
      return chat; // keep stored name/image
    }

    const otherId = (chat.participants || []).find((p) => !p.equals(uId));
    const other = otherId ? otherMap.get(otherId.toString()) : null;

    return {
      ...chat,
      name: other?.name || "Unknown User",
      image: other?.image || null,
    };
  });

  return {
    userId,
    chats: mapped,
    total: mapped.length,
  };
};

export const addParticipant = async (chatId, newUserId) => {
  const chats = getChatCollection();
  const cId = toObjectId(chatId);
  const nId = toObjectId(newUserId);

  const chat = await chats.findOne({ _id: cId });
  if (!chat) throw new Error("Chat not found");
  if (chat.type !== "group") throw new Error("Not a group chat");

  await chats.updateOne({ _id: cId }, { $addToSet: { participants: nId } });
  return { chatId, added: newUserId };
};

export const removeParticipant = async (chatId, userId) => {
  const chats = getChatCollection();
  const cId = toObjectId(chatId);
  const uId = toObjectId(userId);

  const chat = await chats.findOne({ _id: cId });
  if (!chat) throw new Error("Chat not found");
  if (chat.type !== "group") throw new Error("Not a group chat");

  await chats.updateOne({ _id: cId }, { $pull: { participants: uId } });
  return { chatId, removed: userId };
};

export const updateChat = async (chatId, { name, image }) => {
  const chats = getChatCollection();
  const cId = toObjectId(chatId);

  const chat = await chats.findOne({ _id: cId });
  if (!chat) throw new Error("Chat not found");

  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (image !== undefined) updateFields.image = image;
  if (Object.keys(updateFields).length === 0) {
    throw new Error("No valid fields to update");
  }

  await chats.updateOne({ _id: cId }, { $set: updateFields });
  return { chatId, updated: updateFields };
};

export const deleteChat = async (chatId) => {
  const chats = getChatCollection();
  const messages = getMessageCollection();
  const cId = toObjectId(chatId);

  await messages.deleteMany({ chatId: cId });
  const result = await chats.deleteOne({ _id: cId });
  return { deleted: result.deletedCount === 1 };
};
