import jwt from 'jsonwebtoken';
import { JWT_SECRET_TOKEN } from '../config/environment.js';

export const decodeToken = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Unauthorized: Bearer token required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET_TOKEN);
    
    req.user = {
      _id: payload._id,
      name: payload.name,
      email: payload.email,
      image: payload.image
    };
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};