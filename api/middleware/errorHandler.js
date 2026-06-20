function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
}
module.exports = errorHandler;
