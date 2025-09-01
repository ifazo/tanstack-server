import {
  authenticateUser as authServiceAuthenticate,
  createUser as createUserService,
} from "../services/authService.js";

export const authenticateUser = async (req, res, next) => {
  try {
    const { email, password, name, image } = req.body;
    const result = await authServiceAuthenticate(email, password, name, image);
    res.status(200).json(result);
  } catch (error) {
    console.error("Authentication error:", error);
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { email, password, name, image } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "email and password are required",
      });
    }

    const result = await createUserService({ email, password, name, image });
    res.status(201).json(result);
  } catch (error) {
    if (error.message === "User already exists") {
      return res.status(409).json({
        message: error.message,
      });
    }

    if (error.message === "User not created") {
      return res.status(400).json({
        message: error.message,
      });
    }

    next(error);
  }
};
