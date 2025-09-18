export default function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err);

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Something went wrong on our side!",
  });
}
