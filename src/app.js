import express from "express";
import cors from "cors";
import { createServer } from "http";
import routes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";

export const app = express();
export const server = createServer(app);

app.use(express.json());
app.use(cors());

app.use("/api", routes);

app.use(errorHandler);
