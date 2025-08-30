import { authenticateUser as authServiceAuthenticate } from "../services/authService.js";

export const authenticateUser = async (req, res, next) => {
  try {
    const { name, image, email, password } = req.body;
    const result = await authServiceAuthenticate(email, password, name, image);
    res.status(200).json(result);
  } catch (error) {
    console.error("Authentication error:", error);
    next(error);
  }
};
