import jwt from 'jsonwebtoken';
import { JWT_SECRET_TOKEN } from '../config/environment.js';

export const ownerMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token found" });
    }
    
    const decodedToken = jwt.verify(token, JWT_SECRET_TOKEN);
    req.user = {
      _id: decodedToken._id,
      name: decodedToken.name,
      email: decodedToken.email,
    };

    const userId = req.body?.userId || req.params?.userId || req.query?.userId;

    if (userId && req.user._id !== userId) {
      return res.status(403).json({
        message: "Forbidden: You're not the owner",
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};