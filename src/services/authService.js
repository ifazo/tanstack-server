import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDB } from "../config/database.js";
import { JWT_SECRET_TOKEN } from "../config/environment.js";
import errorHandler from "../middleware/errorHandler.js";

/**
 * Utility: Get User collection
 */
const getUserCollection = () => getDB().collection("users");

/**
 * Utility: Create JWT Token
 */
export const signToken = (payload) => jwt.sign(payload, JWT_SECRET_TOKEN);

/**
 * Find a user by email
 */
export const findUserByEmail = async (email) => {
  return await getUserCollection().findOne({ email });
};

/**
 * Create a new user from social login
 */
export const createSocialUser = async ({ name = "", image = "", email }) => {
  const userCollection = getUserCollection();

  const result = await userCollection.insertOne({
    name,
    image,
    email,
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
export const handleSocialLogin = async (user, email, name, image) => {
  const userData = user
    ? {
        _id: user._id.toString(),
        name: user.name,
        image: user.image,
        email: user.email,
      }
    : await createSocialUser({ name, image, email });

  const token = signToken(userData);

  return {
    token,
    user: userData,
    message: user
      ? "Social login successful"
      : "Social user created & login successful",
  };
};

/**
 * Handle login for regular accounts
 */
export const handleRegularLogin = async (user, password) => {
  if (!user) errorHandler(404, "User not found");

  if (user.password === "social") {
    errorHandler(
      400,
      "This account was created using social login. Please use Google or GitHub to sign in."
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) errorHandler(401, "Invalid password");

  const userData = {
    _id: user._id.toString(),
    name: user.name,
    image: user.image,
    email: user.email,
  };

  return {
    token: signToken(userData),
    user: userData,
    message: "Email login successful",
  };
};

/**
 * Authenticate user (regular or social login)
 */
export const authenticateUser = async (email, password, name = null, image = null) => {
  if (!email || !password) errorHandler(400, "Email and password are required");

  const user = await findUserByEmail(email);

  return password === "social"
    ? await handleSocialLogin(user, email, name, image)
    : await handleRegularLogin(user, password);
};

/**
 * Verify password utility
 */
export const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};
