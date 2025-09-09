export default function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err);

  // If it's a custom AppError
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Unknown / programming errors
  return res.status(500).json({
    success: false,
    message: "Something went wrong on our side!",
  });
}
