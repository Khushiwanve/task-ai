const express = require('express');
const router = express.Router();
const { getAllTasks, getTaskById, createTask, updateTask, deleteTask, toggleSubtask } = require('../controllers/taskController');

router.route('/').get(getAllTasks).post(createTask);
router.route('/:id').get(getTaskById).put(updateTask).delete(deleteTask);
router.patch('/:id/subtasks/:subtaskId/toggle', toggleSubtask);

module.exports = router;
