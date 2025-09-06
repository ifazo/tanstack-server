import {
  getOrCreatePersonalChat,
  createGroupChat,
  addMessage,
  getChatMessages,
  getUserChats,
} from "../services/chatService.js";

export const openPersonalChat = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { receiverId } = req.query;
    if (!receiverId) return res.status(400).json({ message: "receiverId is required" });
    const chat = await getOrCreatePersonalChat(userId, receiverId);
    res.status(200).json(chat);
  } catch (e) {
    next(e);
  }
};

export const createGroup = async (req, res, next) => {
  try {
    const { name, image, participants = [] } = req.body;
    const userId = req.user?._id;
    
    if (!name || !userId)
      return res
        .status(400)
        .json({ message: "createdBy and name are required" });
    const chat = await createGroupChat({
      userId,
      name,
      image,
      participantIds: participants,
    });
    res.status(201).json(chat);
  } catch (e) {
    next(e);
  }
};

export const postMessage = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { text, attachments = [], replyTo = null } = req.body;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!text && attachments.length === 0) {
      return res.status(400).json({ message: "text or attachments required" });
    }
    const msg = await addMessage({ chatId, senderId: userId, text, attachments, replyTo });
    res.status(201).json(msg);
  } catch (e) {
    next(e);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { skip, limit, sort } = req.query;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const data = await getChatMessages(chatId, userId, { skip, limit, sort });
    res.status(200).json(data);
  } catch (e) {
    next(e);
  }
};

export const userChatList = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const data = await getUserChats(userId);
    res.status(200).json(data);
  } catch (e) {
    next(e);
  }
};
