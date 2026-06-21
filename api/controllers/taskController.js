const { v4: uuidv4 } = require('uuid');
const { readTasks, writeTasks } = require('../utils/db');

const VALID_STATUSES = ['todo', 'in-progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

function getAllTasks(req, res) {
  let tasks = readTasks();
  const { status, priority, tag } = req.query;
  if (status) tasks = tasks.filter(t => t.status === status);
  if (priority) tasks = tasks.filter(t => t.priority === priority)
  if (tag) tasks = tasks.filter(t => t.tags && t.tags.includes(tag));

  // Stats summary
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    completionRate: tasks.length ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0,
  };

  res.json({ stats, tasks });
}

function getTaskById(req, res) {
  const tasks = readTasks();
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
}

function createTask(req, res) {
  const { title, description, priority, tags, dueDate, estimatedMinutes, subtasks } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority. Use: ${VALID_PRIORITIES.join(', ')}` });
  }

  const newTask = {
    id: uuidv4(),
    title: title.trim(),
    description: description?.trim() || '',
    status: 'todo',
    priority: priority || 'medium',
    tags: Array.isArray(tags) ? tags : [],
    dueDate: dueDate || null,
    estimatedMinutes: estimatedMinutes || null,
    subtasks: Array.isArray(subtasks) ? subtasks.map(s => ({
      id: uuidv4(),
      title: s.title || s,
      done: false,
      estimatedMinutes: s.estimatedMinutes || null,
    })) : [],
    aiGenerated: req.body.aiGenerated || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const tasks = readTasks();
  tasks.push(newTask);
  writeTasks(tasks);
  res.status(201).json(newTask);
}

function updateTask(req, res) {
  const tasks = readTasks();
  const index = tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });

  const { title, description, status, priority, tags, dueDate, estimatedMinutes, subtasks } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Use: ${VALID_STATUSES.join(', ')}` });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority. Use: ${VALID_PRIORITIES.join(', ')}` });
  }

  const updatedTask = {
    ...tasks[index],
    ...(title !== undefined && { title: title.trim() }),
    ...(description !== undefined && { description: description.trim() }),
    ...(status && { status }),
    ...(priority && { priority }),
    ...(tags !== undefined && { tags }),
    ...(dueDate !== undefined && { dueDate }),
    ...(estimatedMinutes !== undefined && { estimatedMinutes }),
    ...(subtasks !== undefined && { subtasks }),
    updatedAt: new Date().toISOString(),
  };

  // Auto-mark done if all subtasks done
  if (updatedTask.subtasks.length > 0 && updatedTask.subtasks.every(s => s.done)) {
    updatedTask.status = 'done';
  }

  tasks[index] = updatedTask;
  writeTasks(tasks);
  res.json(updatedTask);
}

function deleteTask(req, res) {
  const tasks = readTasks();
  const index = tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });
  const deleted = tasks.splice(index, 1)[0];
  writeTasks(tasks);
  res.json({ message: 'Task deleted', task: deleted });
}

function toggleSubtask(req, res) {
  const tasks = readTasks();
  const taskIndex = tasks.findIndex(t => t.id === req.params.id);
  if (taskIndex === -1) return res.status(404).json({ error: 'Task not found' });

  const task = tasks[taskIndex];
  const subtask = task.subtasks.find(s => s.id === req.params.subtaskId);
  if (!subtask) return res.status(404).json({ error: 'Subtask not found' });

  subtask.done = !subtask.done;
  task.updatedAt = new Date().toISOString();

  // Auto-complete parent task if all subtasks done
  if (task.subtasks.length > 0 && task.subtasks.every(s => s.done)) {
    task.status = 'done';
  }

  writeTasks(tasks);
  res.json(task);
}

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask, toggleSubtask };
