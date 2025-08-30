export default function errorHandler(err, _req, res, next) {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const message = typeof err === 'string' ? err : err?.message || 'Internal Server Error';

  if (res.headersSent) return next(err);

  return res.status(status).json({
    success: false,
    message
  });
}