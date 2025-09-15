import { ObjectId } from "mongodb";
import { getDB } from "../config/database.js";
import { throwError } from "../utils/errorHandler.js";

const getFriendCollection = () => getDB().collection("friends");
const getUserCollection = () => getDB().collection("users");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

const findMutualFriends = async (userId, otherId) => {
  const friendsCol = getFriendCollection();
  const usersCol = getUserCollection();

  const uOid = toObjectId(userId);
  const oOid = toObjectId(otherId);

  const myFriendsDocs = await friendsCol.find({
    status: "accepted",
    $or: [{ from: uOid }, { to: uOid }]
  }).toArray();
  const myFriendIds = new Set(
    myFriendsDocs.map((d) => String(d.from.equals(uOid) ? d.to : d.from))
  );

  const otherFriendsDocs = await friendsCol.find({
    status: "accepted",
    $or: [{ from: oOid }, { to: oOid }]
  }).toArray();
  const otherFriendIds = otherFriendsDocs.map((d) =>
    String(d.from.equals(oOid) ? d.to : d.from)
  );

  const mutualIds = otherFriendIds.filter((fid) => myFriendIds.has(fid));
  if (!mutualIds.length) return [];

  const mutualUsers = await usersCol
    .find({ _id: { $in: mutualIds.map((id) => toObjectId(id)) } })
    .project({ name: 1, image: 1, userName: 1 })
    .toArray();

  return mutualUsers;
};


export const sendFriendRequest = async (fromUserId, toUserId) => {
  if (!ObjectId.isValid(fromUserId) || !ObjectId.isValid(toUserId)) throwError(400, "Invalid user id");
  if (String(fromUserId) === String(toUserId)) throwError(400, "Cannot send request to yourself");

  const friendsCol = getFriendCollection();
  const fromOid = toObjectId(fromUserId);
  const toOid = toObjectId(toUserId);

  const accepted = await friendsCol.findOne({
    $or: [
      { from: fromOid, to: toOid, status: "accepted" },
      { from: toOid, to: fromOid, status: "accepted" },
    ],
  });
  if (accepted) throwError(409, "Already friends");

  const existing = await friendsCol.findOne({
    $or: [
      { from: fromOid, to: toOid, status: "pending" },
      { from: toOid, to: fromOid, status: "pending" },
    ],
  });
  if (existing) throwError(409, "Friend request already pending");

  const doc = {
    from: fromOid,
    to: toOid,
    status: "pending",
    createdAt: new Date(),
  };

  const r = await friendsCol.insertOne(doc);
  return { _id: r.insertedId, ...doc };
};

export const acceptFriendRequest = async (requestId, userId) => {
  if (!ObjectId.isValid(requestId) || !ObjectId.isValid(userId)) throwError(400, "Invalid id");

  const friendsCol = getFriendCollection();
  const rOid = toObjectId(requestId);
  const uOid = toObjectId(userId);

  const reqDoc = await friendsCol.findOne({ _id: rOid });
  if (!reqDoc) throwError(404, "Request not found");
  if (!reqDoc.to || !reqDoc.to.equals(uOid)) throwError(403, "Not allowed to accept");
  if (reqDoc.status === "accepted") return { message: "Already accepted", requestId };

  const now = new Date();
  await friendsCol.updateOne(
    { _id: rOid },
    { $set: { status: "accepted", acceptedAt: now } }
  );

  return { message: "Accepted", requestId };
};

export const declineFriendRequest = async (requestId, userId) => {
  if (!ObjectId.isValid(requestId) || !ObjectId.isValid(userId)) throwError(400, "Invalid id");

  const friendsCol = getFriendCollection();
  const rOid = toObjectId(requestId);
  const uOid = toObjectId(userId);

  const reqDoc = await friendsCol.findOne({ _id: rOid });
  if (!reqDoc) throwError(404, "Request not found");
  if (!reqDoc.to || !reqDoc.to.equals(uOid)) throwError(403, "Not allowed to decline");
  if (reqDoc.status === "declined") return { message: "Already declined", requestId };

  const now = new Date();
  await friendsCol.updateOne(
    { _id: rOid },
    { $set: { status: "declined", declinedAt: now } }
  );

  return { message: "Declined", requestId };
};

export const cancelFriendRequest = async (requestId, actorId) => {
  if (!ObjectId.isValid(requestId) || !ObjectId.isValid(actorId)) throwError(400, "Invalid id");

  const friendsCol = getFriendCollection();
  const rOid = toObjectId(requestId);
  const actorOid = toObjectId(actorId);

  const reqDoc = await friendsCol.findOne({ _id: rOid });
  if (!reqDoc) throwError(404, "Request not found");
  if (!reqDoc.from || !reqDoc.from.equals(actorOid)) throwError(403, "Not allowed to cancel");
  if (reqDoc.status !== "pending") throwError(400, "Only pending requests can be cancelled");

  await friendsCol.deleteOne({ _id: rOid });

  return { message: "Cancelled", requestId };
};

export const listFriends = async (userId) => {
  if (!ObjectId.isValid(userId)) throwError(400, "Invalid user id");
  const friendsCol = getFriendCollection();
  const usersCol = getUserCollection();
  const uOid = toObjectId(userId);

  const docs = await friendsCol
    .find({ status: "accepted", $or: [{ from: uOid }, { to: uOid }] })
    .toArray();

  if (!docs.length) return [];

  const otherIds = docs.map((d) => (d.from.equals(uOid) ? d.to : d.from));
  const uniqueOther = Array.from(new Set(otherIds.map((id) => String(id)))).map((s) => toObjectId(s));

  const users = await usersCol
    .find({ _id: { $in: uniqueOther } })
    .project({ name: 1, image: 1, userName: 1 })
    .toArray();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return Promise.all(
    docs.map(async (d) => {
      const other = d.from.equals(uOid) ? d.to : d.from;
      const u = userMap.get(String(other));
      const mutualFriends = await findMutualFriends(userId, other);

      return {
        _id: d._id,
        name: u?.name || null,
        image: u?.image || null,
        userName: u?.userName || null,
        friendedAt: d.acceptedAt || null,
        mutualFriends,
      };
    })
  );
};

export const getIncomingRequests = async (userId) => {
  if (!ObjectId.isValid(userId)) throwError(400, "Invalid user id");
  const friendsCol = getFriendCollection();
  const users = getUserCollection();
  const uOid = toObjectId(userId);

  const docs = await friendsCol.find({ to: uOid, status: "pending" }).sort({ createdAt: -1 }).toArray();
  if (!docs.length) return [];

  const fromIds = docs.map((d) => d.from);
  const fromUsers = await users.find({ _id: { $in: fromIds } }).project({ name: 1, image: 1, userName: 1 }).toArray();
  const fromMap = new Map(fromUsers.map((u) => [String(u._id), u]));

  return Promise.all(
    docs.map(async (d) => {
      const fromUser = fromMap.get(String(d.from)) || { _id: d.from };
      const mutualFriends = await findMutualFriends(userId, d.from);

      return {
        _id: d._id,
        from: fromUser,
        createdAt: d.createdAt,
        mutualFriends,
      };
    })
  );
};

export const getSendingRequests = async (userId) => {
  if (!ObjectId.isValid(userId)) throwError(400, "Invalid user id");
  const friendsCol = getFriendCollection();
  const users = getUserCollection();
  const uOid = toObjectId(userId);

  const docs = await friendsCol.find({ from: uOid, status: "pending" }).sort({ createdAt: -1 }).toArray();
  if (!docs.length) return [];

  const toIds = docs.map((d) => d.to);
  const toUsers = await users.find({ _id: { $in: toIds } }).project({ name: 1, image: 1, userName: 1 }).toArray();
  const toMap = new Map(toUsers.map((u) => [String(u._id), u]));

  return Promise.all(
    docs.map(async (d) => {
      const toUser = toMap.get(String(d.to)) || { _id: d.to };
      const mutualFriends = await findMutualFriends(userId, d.to);

      return {
        _id: d._id,
        to: toUser,
        createdAt: d.createdAt,
        mutualFriends,
      };
    })
  );
};

export const getSuggestions = async (userId, limit = 10) => {
  if (!ObjectId.isValid(userId)) throwError(400, "Invalid user id");
  const usersCol = getUserCollection();
  const friendsCol = getFriendCollection();

  const uOid = toObjectId(userId);

  const accepted = await friendsCol.find({ status: "accepted", $or: [{ from: uOid }, { to: uOid }] }).toArray();
  const acceptedIds = accepted.flatMap((d) => (d.from.equals(uOid) ? d.to : d.from)).map((id) => String(id));

  const pending = await friendsCol.find({ status: "pending", $or: [{ from: uOid }, { to: uOid }] }).toArray();
  const pendingIds = pending.flatMap((d) => (d.from.equals(uOid) ? d.to : d.from)).map((id) => String(id));

  const exclude = new Set([String(uOid), ...acceptedIds, ...pendingIds]);

  const cursor = usersCol
    .find({ _id: { $nin: Array.from(exclude).map((id) => toObjectId(id)) } })
    .project({ name: 1, image: 1, userName: 1 })
    .sort({ createdAt: 1 })
    .limit(parseInt(limit, 12));

  const list = await cursor.toArray();

  return Promise.all(
    list.map(async (u) => {
      const mutualFriends = await findMutualFriends(userId, u._id);
      return {
        ...u,
        mutualFriends,
      };
    })
  );
};
