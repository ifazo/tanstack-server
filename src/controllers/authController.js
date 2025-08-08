import { 
  createUserToken, 
  authenticateUser as authServiceAuthenticate 
} from '../services/authService.js';

export const createToken = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const token = await createUserToken(email);
    
    res.status(200).json({ token });
  } catch (error) {
    console.error("Token creation error:", error);
    res.status(500).json({
      message: "Failed to create token",
    });
    next(error);
  }
};

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