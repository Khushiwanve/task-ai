const express = require('express');
const router = express.Router();
const { breakdownTask, getCoaching, suggestNext } = require('../controllers/aiController');

router.post('/breakdown', breakdownTask);
router.post('/coach', getCoaching);
router.post('/suggest-next', suggestNext);

module.exports = router;
