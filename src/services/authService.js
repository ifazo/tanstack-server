import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDB } from '../config/database.js';
import { JWT_SECRET_TOKEN } from '../config/environment.js';
import errorHandler from '../middleware/errorHandler.js';

const getUserCollection = () => {
  const db = getDB();
  return db.collection('users');
};

export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET_TOKEN);
};

export const findUserByEmail = async (email) => {
  const userCollection = getUserCollection();
  return await userCollection.findOne({ email });
};

export const createSocialUser = async (userData) => {
  const { name, email } = userData;
  const userCollection = getUserCollection();
  
  const result = await userCollection.insertOne({
    name: name || "Social User",
    email: email,
    password: "social",
    createdAt: new Date(),
  });

  return {
    _id: result.insertedId.toString(),
    name: name || "Social User",
    email: email,
  };
};

export const createUserToken = async (email) => {
  const user = await findUserByEmail(email);
  
  if (!user) {
    errorHandler(404, "User not found");
  }
  
  const payload = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
  };
  
  return generateToken(payload);
};

export const handleSocialLogin = async (user, email, name) => {
  if (!user) {
    // Create new social user
    const newUser = await createSocialUser({ name, email });

    const payload = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
    };

    return {
      token: generateToken(payload),
      user: payload,
      message: "Social user created & login successful",
    };
  } else {
    // Existing social user login
    const payload = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    return {
      token: generateToken(payload),
      user: payload,
      message: "Social login successful",
    };
  }
};

export const handleRegularLogin = async (user, password) => {
  if (!user) {
    errorHandler(404, "User not found");
  }

  if (user.password === "social") {
    errorHandler(400, "This account was created using social login. Please use Google or GitHub to sign in.");
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    errorHandler(401, "Invalid password");
  }

  const payload = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
  };

  return {
    token: generateToken(payload),
    user: payload,
    message: "Email Login successful",
  };
};

export const authenticateUser = async (email, password, name = null) => {
  if (!email || !password) {
    errorHandler(400, "Email and password are required");
  }

  const user = await findUserByEmail(email);
  
  // Handle social login
  if (password === "social") {
    return await handleSocialLogin(user, email, name);
  }

  // Handle regular login
  return await handleRegularLogin(user, password);
};

export const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};