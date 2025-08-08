import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const CLIENT_URL = process.env.CLIENT_URL;
export const MONGODB_URI = process.env.MONGODB_URI;
export const MONGODB_DB = process.env.MONGODB_DB;
export const JWT_SECRET_TOKEN = process.env.JWT_SECRET_TOKEN;
