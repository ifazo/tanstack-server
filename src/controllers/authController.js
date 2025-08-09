// Removed createToken import/use
import { authenticateUser as authServiceAuthenticate } from "../services/authService.js";

export const authenticateUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authServiceAuthenticate(email, password, name);
    res.status(200).json(result);
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      message: "Authentication failed",
    });
    next(error);
  }
};
