const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";

  if (status === 500) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  }

  res.status(status).json({
    error: true,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
