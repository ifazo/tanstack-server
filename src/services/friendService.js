import { ObjectId } from "mongodb";
import { getDB } from "../config/database.js";
import { throwError } from "../utils/errorHandler.js";

const getRequestCollection = () => getDB().collection("friend_requests");
const getFriendCollection = () => getDB().collection("friends");
const getUserCollection = () => getDB().collection("users");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const listFriends = async (userId) => {
  if (!ObjectId.isValid(userId)) throwError(400, "Invalid user id");
  const friendsCol = getFriendCollection();
  const usersCol = getUserCollection();
  const uOid = toObjectId(userId);

  const docs = await friendsCol.find({ participants: uOid }).toArray();
  if (!docs.length) return [];

  const otherIds = docs
    .map(d => d.participants.find(p => !p.equals(uOid)))
    .filter(Boolean);

  if (!otherIds.length) return [];

  const userDocs = await usersCol
    .find({ _id: { $in: otherIds } })
    .project({ name: 1, image: 1 })
    .toArray();

  const map = new Map(userDocs.map(u => [u._id.toString(), u]));

  return docs.map(d => {
    const other = d.participants.find(p => !p.equals(uOid));
    const otherStr = other?.toString();
    return {
      _id: other,
      name: map.get(otherStr)?.name || null,
      image: map.get(otherStr)?.image || null,
      connectedAt: d.createdAt || null
    };
  });
};

export const sendFriendRequest = async (fromUserId, toUserId) => {
  if (!ObjectId.isValid(fromUserId) || !ObjectId.isValid(toUserId)) throwError(400, "Invalid user id");
  if (fromUserId === toUserId) throwError(400, "Cannot send request to yourself");

  const requests = getRequestCollection();
  const friends = getFriendCollection();

  const fromOid = toObjectId(fromUserId);
  const toOid = toObjectId(toUserId);

  const already = await friends.findOne({ participants: { $all: [fromOid, toOid], $size: 2 } });
  if (already) throwError(409, "Already friends");

  const existing = await requests.findOne({
    $or: [
      { from: fromOid, to: toOid, status: "pending" },
      { from: toOid, to: fromOid, status: "pending" }
    ]
  });
  if (existing) throwError(409, "Friend request already pending");

  const doc = {
    from: fromOid,
    to: toOid,
    status: "pending",
    createdAt: new Date()
  };
  const r = await requests.insertOne(doc);
  return { _id: r.insertedId, ...doc };
};

export const acceptFriendRequest = async (requestId, userId) => {
  if (!ObjectId.isValid(requestId) || !ObjectId.isValid(userId)) throwError(400, "Invalid id");

  const requests = getRequestCollection();
  const friends = getFriendCollection();

  const rOid = toObjectId(requestId);
  const userOid = toObjectId(userId);

  const reqDoc = await requests.findOne({ _id: rOid });
  if (!reqDoc) throwError(404, "Request not found");
  if (!reqDoc.to.equals(userOid)) throwError(403, "Not allowed to accept");
  if (reqDoc.status === "accepted") throwError(400, "Request already accepted");

  await requests.updateOne({ _id: rOid }, { $set: { status: "accepted", respondedAt: new Date() } });

  const participants = [reqDoc.from, reqDoc.to];

  // check existing friendship first
  const existing = await friends.findOne({ participants: { $all: participants, $size: 2 } });
  if (existing) {
    return { message: "Accepted", requestId, friendCreated: false, friend: existing };
  }

  const createdAt = new Date();
  const insertResult = await friends.insertOne({ participants, createdAt });

  return {
    message: "Accepted",
    requestId,
    friendCreated: true,
    friendId: insertResult.insertedId
  };
};

export const declineFriendRequest = async (requestId, userId) => {
  if (!ObjectId.isValid(requestId) || !ObjectId.isValid(userId)) throwError(400, "Invalid id");

  const requests = getRequestCollection();
  const rOid = toObjectId(requestId);
  const userOid = toObjectId(userId);

  const reqDoc = await requests.findOne({ _id: rOid });
  if (!reqDoc) throwError(404, "Request not found");
  if (!reqDoc.to.equals(userOid)) throwError(403, "Not allowed to decline");

  await requests.updateOne({ _id: rOid }, { $set: { status: "declined", respondedAt: new Date() } });
  return { message: "Declined", requestId };
};

export const getIncomingRequests = async (userId) => {
  if (!ObjectId.isValid(userId)) throwError(400, "Invalid user id");
  const requests = getRequestCollection();
  const users = getUserCollection();
  const uOid = toObjectId(userId);

  const docs = await requests
    .find({ to: uOid, status: "pending" })
    .sort({ createdAt: -1 })
    .toArray();

  const fromIds = docs.map(d => d.from);
  if (!fromIds.length) return [];

  const fromUsers = await users.find({ _id: { $in: fromIds } }).project({ name: 1, image: 1 }).toArray();
  const fromMap = new Map(fromUsers.map(u => [u._id.toString(), u]));

  return docs.map(d => ({ _id: d._id, from: fromMap.get(d.from.toString()) || { _id: d.from }, createdAt: d.createdAt }));
};

export const getSuggestions = async (userId, limit = 10) => {
  if (!ObjectId.isValid(userId)) throwError(400, "Invalid user id");
  const usersCol = getUserCollection();
  const friendsCol = getFriendCollection();
  const requestsCol = getRequestCollection();

  const uOid = toObjectId(userId);

  // gather excluded ids: self, friends, pending requests (from or to)
  const friendDocs = await friendsCol.find({ participants: uOid }).toArray();
  const friendIds = friendDocs.map(f => f.participants.find(p => !p.equals(uOid)).toString());

  const pending = await requestsCol.find({ $or: [{ from: uOid }, { to: uOid }] }).toArray();
  const pendingIds = pending.flatMap(p => [p.from.toString(), p.to.toString()]);

  const exclude = new Set([uOid.toString(), ...friendIds, ...pendingIds]);

  const cursor = usersCol
    .find({ _id: { $nin: Array.from(exclude).map(id => toObjectId(id)) } })
    .project({ name: 1, image: 1 })
    .limit(parseInt(limit, 10));

  const list = await cursor.toArray();
  return list;
};