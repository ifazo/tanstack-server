import jwt from "jsonwebtoken";
import { JWT_SECRET_TOKEN } from "../config/environment.js";

export const adminMiddleware = (req, res, next) => {
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
      role: decodedToken.role,
    };

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};
