import { 
  createGroup as createGroupService,
  getAllGroups as getAllGroupsService,
  getGroupById as getGroupByIdService,
  getGroupChatMessages as getGroupChatMessagesService,
  addMessageToGroup as addMessageToGroupService,
  addMemberToGroup as addMemberToGroupService,
  removeMemberFromGroup as removeMemberFromGroupService,
  updateGroup as updateGroupService,
  deleteGroup as deleteGroupService
} from '../services/groupService.js';

export const createGroup = async (req, res, next) => {
  try {
    const { name, createdBy } = req.body;

    // Validation
    if (!name || !createdBy) {
      return res.status(400).json({
        message: "name and createdBy are required",
      });
    }

    const group = await createGroupService({ name, createdBy });
    res.status(201).json(group);
  } catch (error) {
    if (error.message === 'Group not created') {
      return res.status(400).json({
        message: error.message,
      });
    }
    next(error);
  }
};

export const getAllGroups = async (req, res, next) => {
  try {
    const groups = await getAllGroupsService();
    res.status(200).json(groups);
  } catch (error) {
    next(error);
  }
};

export const getGroupById = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({
        message: "groupId is required",
      });
    }

    const group = await getGroupByIdService(groupId);
    res.status(200).json(group);
  } catch (error) {
    if (error.message === 'Group not found') {
      return res.status(404).json({
        message: error.message,
      });
    }
    next(error);
  }
};

export const getGroupChatMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({
        message: "groupId is required",
      });
    }

    const chatData = await getGroupChatMessagesService(groupId);
    res.status(200).json(chatData);
  } catch (error) {
    if (error.message === 'Group not found') {
      return res.status(404).json({
        message: error.message,
      });
    }
    next(error);
  }
};

export const addMessageToGroup = async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    const { message } = req.body;

    // Validation
    if (!groupId || !userId) {
      return res.status(400).json({
        message: "groupId and userId are required",
      });
    }

    if (!message) {
      return res.status(400).json({
        message: "Message is required",
      });
    }

    const newMsg = await addMessageToGroupService(
      groupId, 
      userId, 
      message, 
      req.user
    );
    
    res.status(201).json(newMsg);
  } catch (error) {
    if (error.message === 'Group not found') {
      return res.status(404).json({
        message: error.message,
      });
    }
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        message: error.message,
      });
    }
    
    if (error.message === 'Message not added to group') {
      return res.status(400).json({
        message: error.message,
      });
    }
    
    next(error);
  }
};

export const addMemberToGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const memberData = req.body;

    if (!groupId) {
      return res.status(400).json({
        message: "groupId is required",
      });
    }

    if (!memberData.userId || !memberData.userName) {
      return res.status(400).json({
        message: "userId and userName are required",
      });
    }

    const result = await addMemberToGroupService(groupId, memberData);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Member not added to group') {
      return res.status(400).json({
        message: error.message,
      });
    }
    next(error);
  }
};

export const removeMemberFromGroup = async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;

    if (!groupId || !userId) {
      return res.status(400).json({
        message: "groupId and userId are required",
      });
    }

    const result = await removeMemberFromGroupService(groupId, userId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Member not removed from group') {
      return res.status(404).json({
        message: error.message,
      });
    }
    next(error);
  }
};

export const updateGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const updateData = req.body;

    if (!groupId) {
      return res.status(400).json({
        message: "groupId is required",
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "Update data is required",
      });
    }

    const result = await updateGroupService(groupId, updateData);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Group not found or updated') {
      return res.status(404).json({
        message: error.message,
      });
    }
    next(error);
  }
};

export const deleteGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({
        message: "groupId is required",
      });
    }

    const result = await deleteGroupService(groupId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Group not found or deleted') {
      return res.status(404).json({
        message: error.message,
      });
    }
    next(error);
  }
};