import { ObjectId } from "mongodb";
import { getDB } from "../config/database.js";
import { throwError } from "../utils/errorHandler.js";

const getChatCollection = () => getDB().collection("chats");
const getMessageCollection = () => getDB().collection("messages");
const getUserCollection = () => getDB().collection("users");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const createPersonalChat = async (userId, receiverId) => {
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
  const msgDoc = {
    chatId: cId,
    userId: uId,
    text,
    createdAt: now,
  };

  const result = await messages.insertOne(msgDoc);

  await chats.updateOne(
    { _id: cId },
    {
      $set: {
        lastMessageId: result.insertedId,
        updatedAt: now,
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
  if (!chat) throwError(404, "Chat not found");
  if (!chat.participants?.some((p) => p.equals(uId))) {
    throwError(403, "Not a participant");
  }

  let name = null;
  let image = null;
  if (chat.type === "group") {
    name = chat.name || "Group";
    image = chat.image || null;
  } else {
    const otherId = (chat.participants || []).find((p) => !p.equals(uId));
    if (otherId) {
      const other = await users.findOne(
        { _id: otherId },
        { projection: { name: 1, image: 1 } }
      );
      name = other?.name || null;
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

  return {
    _id: chat._id,
    type: chat.type,
    name,
    image,
    messages: data,
  };
};

export const getUserChats = async (userId) => {
  const chats = getChatCollection();
  const users = getUserCollection();
  const messages = getMessageCollection();
  const uId = toObjectId(userId);

  const list = await chats
    .find({ participants: uId })
    .sort({ updatedAt: -1 })
    .toArray();

  const lastMessageIds = list
    .map((c) => c.lastMessageId)
    .filter(Boolean)
    .map(toObjectId);

  const lastMessages = await messages
    .find({ _id: { $in: lastMessageIds } })
    .toArray();

  const lastMessageMap = new Map(
    lastMessages.map((m) => [m._id.toString(), m])
  );

  const otherIds = new Set(
    list
      .filter((c) => c.type === "personal")
      .map((c) => (c.participants || []).find((p) => !p.equals(uId)))
      .filter(Boolean)
      .map((oid) => oid.toString())
  );

  const otherUsers = await users
    .find({ _id: { $in: Array.from(otherIds).map((id) => new ObjectId(id)) } })
    .project({ name: 1, image: 1 })
    .toArray();

  const otherMap = new Map(otherUsers.map((u) => [u._id.toString(), u]));

  const result = list.map((chat) => {
    const lastMsg =
      chat.lastMessageId && lastMessageMap.get(chat.lastMessageId.toString());

    if (chat.type === "group") {
      return { ...chat, lastMessage: lastMsg || null };
    }

    const otherId = (chat.participants || []).find((p) => !p.equals(uId));
    const other = otherId ? otherMap.get(otherId.toString()) : null;

    return {
      ...chat,
      name: other?.name || null,
      image: other?.image || null,
      lastMessage: lastMsg || null,
    };
  });

  return result;
};
