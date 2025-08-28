import {
  getOrCreatePersonalChat,
  createGroupChat,
  addMessage,
  getChatMessages,
  markMessagesSeen,
  getUserChats,
  addParticipant,
  removeParticipant,
  deleteChat
} from '../services/chatService.js';

export const openPersonalChat = async (req, res, next) => {
  try {
    const { userId, otherUserId } = req.params;
    const chat = await getOrCreatePersonalChat(userId, otherUserId);
    res.status(200).json(chat);
  } catch (e) { next(e); }
};

export const createGroup = async (req, res, next) => {
  try {
    const { creatorId, name, participants = [], avatar } = req.body;
    if (!creatorId) return res.status(400).json({ message: 'creatorId required' });
    const chat = await createGroupChat({ creatorId, name, participantIds: participants, avatar });
    res.status(201).json(chat);
  } catch (e) { next(e); }
};

export const postMessage = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { senderId, text, attachments = [] } = req.body;
    if (!senderId) return res.status(400).json({ message: 'senderId required' });
    if (!text && attachments.length === 0) {
      return res.status(400).json({ message: 'text or attachments required' });
    }
    const msg = await addMessage({ chatId, senderId, text, attachments });
    res.status(201).json(msg);
  } catch (e) { next(e); }
};

export const getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { skip, limit, sort } = req.query;
    const data = await getChatMessages(chatId, { skip, limit, sort });
    res.status(200).json(data);
  } catch (e) { next(e); }
};

export const seeMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const result = await markMessagesSeen(chatId, userId);
    res.status(200).json(result);
  } catch (e) { next(e); }
};

export const listUserChats = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const data = await getUserChats(userId);
    res.status(200).json(data);
  } catch (e) { next(e); }
};

export const addGroupParticipant = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const result = await addParticipant(chatId, userId);
    res.status(200).json(result);
  } catch (e) { next(e); }
};

export const removeGroupParticipant = async (req, res, next) => {
  try {
    const { chatId, userId } = req.params;
    const result = await removeParticipant(chatId, userId);
    res.status(200).json(result);
  } catch (e) { next(e); }
};

export const destroyChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const result = await deleteChat(chatId);
    res.status(200).json(result);
  } catch (e) { next(e); }
};