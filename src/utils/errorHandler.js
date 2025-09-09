import AppError from "./appError.js";

export const throwError = (statusCode, message) => {
  throw new AppError(statusCode, message);
};
