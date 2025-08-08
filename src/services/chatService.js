import { getDB } from '../config/database.js';

const getChatCollection = () => {
  const db = getDB();
  return db.collection('chats');
};

export const getUserChatOverview = async (userId) => {
  const chatCollection = getChatCollection();
  const userChat = await chatCollection.findOne({ userId });
  
  if (!userChat) {
    return {
      conversations: [],
      totalConversations: 0
    };
  }

  const conversationsOverview = userChat.conversations?.map((conv) => ({
    receiverId: conv.receiverId,
    lastMessage: conv.messages[conv.messages.length - 1],
    messageCount: conv.messages.length,
    updatedAt: conv.updatedAt,
  })) || [];

  return {
    conversations: conversationsOverview,
    totalConversations: conversationsOverview.length,
  };
};

export const addMessageToPersonalChat = async (userId, receiverId, message) => {
  const chatCollection = getChatCollection();
  const now = new Date();
  
  const newMsg = {
    message: message,
    timestamp: now,
  };

  const userChat = await chatCollection.findOne({ userId });

  if (userChat) {
    const existingConversation = userChat.conversations?.find(
      (conv) => conv.receiverId === receiverId
    );

    if (existingConversation) {
      // Update existing conversation
      await chatCollection.updateOne(
        {
          userId: userId,
          "conversations.receiverId": receiverId,
        },
        {
          $push: { "conversations.$.messages": newMsg },
          $set: {
            "conversations.$.updatedAt": now,
            updatedAt: now,
          },
        }
      );
    } else {
      // Add new conversation to existing chat
      await chatCollection.updateOne(
        { userId: userId },
        {
          $push: {
            conversations: {
              receiverId: receiverId,
              messages: [newMsg],
              updatedAt: now,
            },
          },
          $set: { updatedAt: now },
        }
      );
    }
  } else {
    // Create new chat document
    await chatCollection.insertOne({
      userId: userId,
      conversations: [
        {
          receiverId: receiverId,
          messages: [newMsg],
          updatedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
  }

  return newMsg;
};

export const getConversationMessages = async (userId, receiverId) => {
  const chatCollection = getChatCollection();
  const userChat = await chatCollection.findOne({ userId });
  
  if (!userChat) {
    return {
      receiverId: receiverId,
      messages: [],
      updatedAt: null,
      totalMessages: 0
    };
  }

  const conversation = userChat.conversations?.find(
    (conv) => conv.receiverId === receiverId
  );
  
  if (!conversation) {
    return {
      receiverId: receiverId,
      messages: [],
      updatedAt: null,
      totalMessages: 0
    };
  }

  const messages = conversation.messages || [];
  
  // Sort messages by timestamp
  messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return {
    receiverId: conversation.receiverId,
    messages: messages,
    updatedAt: conversation.updatedAt,
    totalMessages: messages.length,
  };
};

export const deleteConversation = async (userId, receiverId) => {
  const chatCollection = getChatCollection();
  
  const result = await chatCollection.updateOne(
    {
      userId: userId,
      "conversations.receiverId": receiverId,
    },
    {
      $pull: {
        conversations: {
          receiverId: receiverId,
        },
      },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
};

export const findUserChat = async (userId) => {
  const chatCollection = getChatCollection();
  return await chatCollection.findOne({ userId });
};

export const createUserChat = async (userId) => {
  const chatCollection = getChatCollection();
  const now = new Date();
  
  const chatDocument = {
    userId: userId,
    conversations: [],
    createdAt: now,
    updatedAt: now,
  };

  const result = await chatCollection.insertOne(chatDocument);
  return result.acknowledged;
};