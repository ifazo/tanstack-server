import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import errorHandler from '../middleware/errorHandler.js';

const getGroupCollection = () => {
  const db = getDB();
  return db.collection('groups');
};

export const createGroup = async (groupData) => {
  const { name, createdBy } = groupData;
  const groupCollection = getGroupCollection();
  
  const group = {
    name,
    createdBy,
    createdAt: new Date(),
    members: [],
    messages: [],
  };

  const result = await groupCollection.insertOne(group);
  
  if (!result.acknowledged) {
    errorHandler(500, 'Failed to create group');
  }
  
  return {
    _id: result.insertedId,
    ...group
  };
};

export const getAllGroups = async () => {
  const groupCollection = getGroupCollection();
  return await groupCollection.find({}).toArray();
};

export const getGroupById = async (groupId) => {
  const groupCollection = getGroupCollection();
  const group = await groupCollection.findOne({
    _id: new ObjectId(groupId),
  });
  
  if (!group) {
    errorHandler(404, 'Group not found');
  }
  
  return group;
};

export const getGroupChatMessages = async (groupId) => {
  const groupCollection = getGroupCollection();
  const group = await groupCollection.findOne({ groupId });
  
  if (!group) {
    errorHandler(404, 'Group not found');
  }

  const messages = group.messages || [];
  messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return {
    groupId: group.groupId,
    groupName: group.groupName || null,
    totalMessages: messages.length,
    messages,
  };
};

export const addMessageToGroup = async (groupId, userId, message, userInfo) => {
  const groupCollection = getGroupCollection();
  
  // Find group by groupId field (not _id)
  const group = await groupCollection.findOne({ groupId: groupId });
  if (!group) {
    errorHandler(404, 'Group not found');
  }

  // Check if user is a member
  const isMember = group.members.some(
    (member) => member.userId === userId
  );

  if (!isMember) {
    errorHandler(403, 'User is not a member of this group');
  }

  const now = new Date();
  const newMsg = {
    userId: userId,
    userName: userInfo?.name || 'Unknown User',
    userEmail: userInfo?.email || '',
    message: message,
    timestamp: now,
  };

  const result = await groupCollection.updateOne(
    { groupId: groupId },
    {
      $push: { messages: newMsg },
      $set: { updatedAt: now },
    }
  );

  if (result.modifiedCount === 0) {
    errorHandler(500, 'Failed to add message to group');
  }
  
  return newMsg;
};

export const addMemberToGroup = async (groupId, memberData) => {
  const groupCollection = getGroupCollection();
  
  const result = await groupCollection.updateOne(
    { _id: new ObjectId(groupId) },
    {
      $push: { members: memberData },
      $set: { updatedAt: new Date() },
    }
  );

  if (result.modifiedCount === 0) {
    errorHandler(404, 'Group not found or member already exists');
  }
  
  return result;
};

export const removeMemberFromGroup = async (groupId, userId) => {
  const groupCollection = getGroupCollection();
  
  const result = await groupCollection.updateOne(
    { _id: new ObjectId(groupId) },
    {
      $pull: { members: { userId: userId } },
      $set: { updatedAt: new Date() },
    }
  );

  if (result.modifiedCount === 0) {
    errorHandler(404, 'Group not found or member not found');
  }
  
  return result;
};

export const updateGroup = async (groupId, updateData) => {
  const groupCollection = getGroupCollection();
  
  updateData.updatedAt = new Date();
  
  const result = await groupCollection.updateOne(
    { _id: new ObjectId(groupId) },
    { $set: updateData }
  );

  if (result.modifiedCount === 0) {
    errorHandler(404, 'Group not found or no changes made');
  }
  
  return result;
};

export const deleteGroup = async (groupId) => {
  const groupCollection = getGroupCollection();
  
  const result = await groupCollection.deleteOne({
    _id: new ObjectId(groupId),
  });

  if (result.deletedCount === 0) {
    errorHandler(404, 'Group not found');
  }
  
  return result;
};

export const checkGroupMembership = async (groupId, userId) => {
  const groupCollection = getGroupCollection();
  const group = await groupCollection.findOne({
    _id: new ObjectId(groupId),
    "members.userId": userId
  });
  
  return !!group;
};