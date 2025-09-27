import bcrypt from 'bcrypt';
import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import { throwError } from "../utils/errorHandler.js";

const getUserCollection = () => getDB().collection("users");

const toObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(id));

export const findUsers = async ({ q }) => {
  const userCollection = getUserCollection();

  if (!q || !q.trim()) {
    return [];
  }

  const query = {
    $or: [
      { name: { $regex: q, $options: "i" } },
      { username: { $regex: q, $options: "i" } },
    ],
  };

  const users = await userCollection
    .find(query, {
      projection: { _id: 1, name: 1, image: 1, username: 1 },
    })
    .toArray();

  return users;
};

export const findUserById = async (userId) => {
  const userCollection = getUserCollection();

  const oid = toObjectId(userId);

  const [user] = await userCollection.aggregate([
    { $match: { _id: oid } },

    {
      $lookup: {
        from: "friends",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$status", "accepted"] },
                  { $or: [{ $eq: ["$from", "$$uid"] }, { $eq: ["$to", "$$uid"] }] }
                ]
              }
            }
          },
          { $count: "count" }
        ],
        as: "friendsCountArr"
      }
    },

    {
      $lookup: {
        from: "follows",
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$following", "$$uid"] } } },
          { $count: "count" }
        ],
        as: "followersCountArr"
      }
    },

    {
      $addFields: {
        friendsCount: { $ifNull: [{ $arrayElemAt: ["$friendsCountArr.count", 0] }, 0] },
        followersCount: { $ifNull: [{ $arrayElemAt: ["$followersCountArr.count", 0] }, 0] }
      }
    },

    {
      $project: {
        friendsCountArr: 0,
        followersCountArr: 0,
        password: 0
      }
    }
  ]).toArray();

  if (!user) throwError(404, 'User not found');

  return user;
};

export const updateUser = async ({userId, userData }) => {
  const userCollection = getUserCollection();
  
  userData .updatedAt = new Date();
  const result = await userCollection.updateOne(
    { _id: toObjectId(userId) },
    { $set: userData  }
  );

  if (result.modifiedCount === 0) {
    throwError(404, 'User not found or no changes made');
  }
  
  return result;
};

export const deleteUser = async (userId) => {
  const userCollection = getUserCollection();
  
  const result = await userCollection.deleteOne({
    _id: toObjectId(userId),
  });

  if (result.deletedCount === 0) {
    throwError(404, 'User not found');
  }
  
  return result;
};
