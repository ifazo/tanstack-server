import { 
  getUserChatOverview as getUserChatOverviewService,
  addMessageToPersonalChat as addMessageToPersonalChatService,
  getConversationMessages as getConversationMessagesService,
  deleteConversation as deleteConversationService
} from '../services/chatService.js';

export const getUserChatOverview = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        message: "userId is required" 
      });
    }

    const chatOverview = await getUserChatOverviewService(userId);
    res.status(200).json(chatOverview);
  } catch (error) {
    next(error);
  }
};

export const addMessageToPersonalChat = async (req, res, next) => {
  try {
    const { userId, receiverId } = req.params;
    const { message } = req.body;

    // Validation
    if (!receiverId) {
      return res.status(400).json({
        message: "receiverId is required",
      });
    }

    if (!message) {
      return res.status(400).json({
        message: "Message is required",
      });
    }

    // Business logic handled by service
    const newMsg = await addMessageToPersonalChatService(
      userId, 
      receiverId, 
      message,
    );

    res.status(201).json(newMsg);
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (req, res, next) => {
  try {
    const { userId, receiverId } = req.params;
    
    if (!userId || !receiverId) {
      return res.status(400).json({ 
        message: "userId and receiverId are required" 
      });
    }

    const conversation = await getConversationMessagesService(userId, receiverId);
    res.status(200).json(conversation);
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (req, res, next) => {
  try {
    const { userId, receiverId } = req.params;
    
    if (!userId || !receiverId) {
      return res.status(400).json({
        message: "userId and receiverId are required",
      });
    }

    const deleted = await deleteConversationService(userId, receiverId);
    
    if (!deleted) {
      return res.status(404).json({
        message: "Conversation not found or messages not deleted",
      });
    }

    res.status(204).json();
  } catch (error) {
    next(error);
  }
};