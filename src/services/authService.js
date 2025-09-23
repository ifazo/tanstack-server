import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDB } from "../config/database.js";
import { JWT_SECRET_TOKEN } from "../config/environment.js";
import { throwError } from "../utils/errorHandler.js";

const getUserCollection = () => getDB().collection("users");

const slugUserName = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")          // spaces -> underscore
    .replace(/[^a-z0-9_]/g, "")    // allow a-z0-9 and underscore
    .replace(/^_+|_+$/g, "")       // trim surrounding underscores
    .slice(0, 30);

const generateUniqueUserName = async (baseInput) => {
  const col = getUserCollection();
  const base = slugUserName(baseInput || "");
  let candidate = base || `user${Math.floor(1000 + Math.random() * 9000)}`;
  let i = 0;
  while (await col.findOne({ username: candidate })) {
    i += 1;
    // append number with underscore to keep readable: e.g. name_2
    const suffix = `_${i}`;
    const maxBaseLen = 30 - suffix.length;
    candidate = (base.slice(0, maxBaseLen) || `user${Date.now()}`) + suffix;
    // safety break (extremely unlikely)
    if (i > 10000) candidate = `${candidate}_${Date.now()}`;
  }
  return candidate;
};

/**
 * Create a new user from social login
 */
export const createSocialUser = async ({ email, name = "", image = "" }) => {
  const userCollection = getUserCollection();

  const username = await generateUniqueUserName(name || email.split("@")[0]);

  const result = await userCollection.insertOne({
    name,
    image,
    email,
    username,
    password: "social",
    createdAt: new Date(),
  });

  return {
    _id: result.insertedId.toString(),
    name,
    image,
    email,
  };
};

/**
 * Handle login for social accounts
 */
export const handleSocialLogin = async ({user, email, name, image}) => {
  const userData = user
    ? {
        _id: user._id.toString(),
        name: user.name,
        image: user.image,
        email: user.email,
        username: user.username,
      }
    : await createSocialUser({ name, image, email });

  return {
    token: jwt.sign(userData, JWT_SECRET_TOKEN),
    user: userData,
    message: user
      ? "Social login successful"
      : "Social user created & login successful",
  };
};

/**
 * Handle login for regular accounts
 */
export const handleRegularLogin = async ({user, password}) => {
  if (!user) throwError(404, "User not found");

  if (user.password === "social") {
    throwError(
      400,
      "This account was created using social login. Please use Google or GitHub to sign in."
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throwError(401, "Invalid password");

  const payload = {
    _id: user._id.toString(),
    name: user.name,
    image: user.image,
    email: user.email,
    username: user.username,
  };

  return {
    token: jwt.sign(payload, JWT_SECRET_TOKEN),
    user: payload,
    message: "Email login successful",
  };
};

/**
 * Authenticate user (regular or social login)
 */
export const authenticateUser = async ({email, password, name = null, image = null}) => {
  if (!email || !password) throwError(400, "Email and password are required");

  const user = await getUserCollection().findOne({ email });

  return password === "social"
    ? await handleSocialLogin({user, email, name, image})
    : await handleRegularLogin({user, password});
};

export const createUser = async (userData) => {
  const { email, password, name, image } = userData;
  const userCollection = getUserCollection();
  
  const existingUser = await userCollection.findOne({ email });
  if (existingUser) {
    throwError(400, 'User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const username = await generateUniqueUserName(name || email.split("@")[0]);
  
  const user = { 
    name,
    image,
    email, 
    username,
    password: hashedPassword,
    createdAt: new Date()
  };
  
  const result = await userCollection.insertOne(user);
  
  if (!result.acknowledged) {
    throwError(500, 'Failed to create user');
  }

  const payload = {
    _id: result.insertedId.toString(),
    name: user.name,
    image: user.image,
    email: user.email,
    username: user.username,
  };

  const token = jwt.sign(payload, JWT_SECRET_TOKEN);

  return {
    token,
    user: payload
  };
};