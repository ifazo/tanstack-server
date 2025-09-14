import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const CLIENT_URL = process.env.CLIENT_URL;
export const MONGODB_URI = process.env.MONGODB_URI;
export const MONGODB_DB = process.env.MONGODB_DB;
export const JWT_SECRET_TOKEN = process.env.JWT_SECRET_TOKEN;
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
