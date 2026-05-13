function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  console.error("API ERROR:", err);
  res.status(statusCode).json({
    success: false,
    message: err.message || "Server error",
  });
}

module.exports = errorHandler;
