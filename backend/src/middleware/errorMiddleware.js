export function errorHandler(err, req, res, next) {
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      message: 'Validation error',
      issues: err.issues,
    });
  }

  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  return res.status(status).json({ message });
}
