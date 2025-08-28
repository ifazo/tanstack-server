import { ObjectId } from 'mongodb';
import { getDB } from '../config/database.js';

const getChatCollection = () => getDB().collection('chats');
const getMessageCollection = () => getDB().collection('messages');

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const getOrCreatePersonalChat = async (userId, otherUserId) => {
  const chats = getChatCollection();
  const u1 = toObjectId(userId);
  const u2 = toObjectId(otherUserId);

  let chat = await chats.findOne({
    type: 'personal',
    participants: { $all: [u1, u2], $size: 2 }
  });

  if (chat) return chat;

  const now = new Date();
  const doc = {
    type: 'personal',
    participants: [u1, u2],
    name: null,
    avatar: null,
    createdAt: now,
    lastMessage: null
  };
  const result = await chats.insertOne(doc);
  return { _id: result.insertedId, ...doc };
};

export const createGroupChat = async ({ creatorId, name, participantIds = [], avatar = null }) => {
  const chats = getChatCollection();
  const now = new Date();
  const participants = [...new Set([creatorId, ...participantIds])].map(toObjectId);
  const doc = {
    type: 'group',
    participants,
    name: name?.trim() || 'New Group',
    avatar: avatar || null,
    createdAt: now,
    lastMessage: null
  };
  const result = await chats.insertOne(doc);
  return { _id: result.insertedId, ...doc };
};

export const addMessage = async ({ chatId, senderId, text, attachments = [] }) => {
  const chats = getChatCollection();
  const messages = getMessageCollection();

  const cId = toObjectId(chatId);
  const sId = toObjectId(senderId);

  const chat = await chats.findOne({ _id: cId });
  if (!chat) throw new Error('Chat not found');
  if (!chat.participants.some(p => p.equals(sId))) throw new Error('Not a participant');

  const now = new Date();
  const msgDoc = {
    conversationId: cId,
    senderId: sId,
    text: text || '',
    attachments,
    createdAt: now,
    seenBy: [sId]
  };

  const result = await messages.insertOne(msgDoc);

  await chats.updateOne(
    { _id: cId },
    {
      $set: {
        lastMessage: {
          senderId: sId,
          text: msgDoc.text,
          createdAt: now
        }
      }
    }
  );

  return { _id: result.insertedId, ...msgDoc };
};

export const getChatMessages = async (chatId, { skip = 0, limit = 50, sort = 'asc' } = {}) => {
  const messages = getMessageCollection();
  const cId = toObjectId(chatId);

  const direction = sort === 'desc' ? -1 : 1;

  const cursor = messages
    .find({ conversationId: cId })
    .sort({ createdAt: direction })
    .skip(parseInt(skip))
    .limit(parseInt(limit));

  const data = await cursor.toArray();
  const total = await messages.countDocuments({ conversationId: cId });

  // If client wants chronological ascending after paginating descending, they can reverse externally
  return {
    chatId,
    messages: data,
    total,
    skip: Number(skip),
    limit: Number(limit),
    hasMore: Number(skip) + Number(limit) < total
  };
};

export const markMessagesSeen = async (chatId, userId) => {
  const messages = getMessageCollection();
  const cId = toObjectId(chatId);
  const uId = toObjectId(userId);

  await messages.updateMany(
    { conversationId: cId, seenBy: { $ne: uId } },
    { $addToSet: { seenBy: uId } }
  );
  return { chatId, userId, updated: true };
};

export const getUserChats = async (userId) => {
  const chats = getChatCollection();
  const uId = toObjectId(userId);

  const list = await chats
    .find({ participants: uId })
    .sort({ 'lastMessage.createdAt': -1, createdAt: -1 })
    .toArray();

  return {
    userId,
    chats: list,
    total: list.length
  };
};

export const addParticipant = async (chatId, newUserId) => {
  const chats = getChatCollection();
  const cId = toObjectId(chatId);
  const nId = toObjectId(newUserId);

  const chat = await chats.findOne({ _id: cId });
  if (!chat) throw new Error('Chat not found');
  if (chat.type !== 'group') throw new Error('Not a group chat');

  await chats.updateOne(
    { _id: cId },
    { $addToSet: { participants: nId } }
  );
  return { chatId, added: newUserId };
};

export const removeParticipant = async (chatId, userId) => {
  const chats = getChatCollection();
  const cId = toObjectId(chatId);
  const uId = toObjectId(userId);

  const chat = await chats.findOne({ _id: cId });
  if (!chat) throw new Error('Chat not found');
  if (chat.type !== 'group') throw new Error('Not a group chat');

  await chats.updateOne(
    { _id: cId },
    { $pull: { participants: uId } }
  );
  return { chatId, removed: userId };
};

export const deleteChat = async (chatId) => {
  const chats = getChatCollection();
  const messages = getMessageCollection();
  const cId = toObjectId(chatId);

  await messages.deleteMany({ conversationId: cId });
  const result = await chats.deleteOne({ _id: cId });
  return { deleted: result.deletedCount === 1 };
};