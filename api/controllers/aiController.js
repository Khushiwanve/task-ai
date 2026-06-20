const { readTasks } = require('../utils/db');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Wraps an async handler so thrown errors/rejections are passed to
// Express's error middleware instead of crashing the process.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function callClaude(systemPrompt, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error('AI features need an ANTHROPIC_API_KEY set in your environment. See .env.example.');
    err.status = 503;
    throw err;
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Anthropic API error');
  }

  const data = await response.json();
  return data.content[0].text;
}

// POST /api/ai/breakdown
// Give it a goal, get back subtasks with time estimates
async function breakdownTask(req, res) {
  const { goal, context } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal is required' });

  const system = `You are a productivity expert. When given a goal, break it into clear, actionable subtasks.
Always respond with ONLY valid JSON, no markdown, no explanation. Format:
{
  "title": "string (refined goal title)",
  "description": "string (1-2 sentence description)",
  "priority": "low|medium|high",
  "estimatedMinutes": number (total estimate),
  "tags": ["tag1", "tag2"],
  "subtasks": [
    { "title": "string", "estimatedMinutes": number }
  ]
}`;

  const userMessage = context
    ? `Goal: ${goal}\nContext: ${context}`
    : `Goal: ${goal}`;

  const raw = await callClaude(system, userMessage);

  let parsed;
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    return res.status(500).json({ error: 'AI returned invalid JSON', raw });
  }

  res.json({ ...parsed, aiGenerated: true });
}

// POST /api/ai/coach
// Give it all tasks, get back productivity insights
async function getCoaching(req, res) {
  const tasks = readTasks();
  const { question } = req.body;

  const summary = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    highPriority: tasks.filter(t => t.priority === 'high' && t.status !== 'done').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
    tasks: tasks.slice(0, 20).map(t => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      subtasksDone: t.subtasks.filter(s => s.done).length,
      subtasksTotal: t.subtasks.length,
    })),
  };

  const system = `You are a friendly, direct productivity coach. Give concise, actionable advice in 2-4 sentences. No fluff.`;
  const userMessage = question
    ? `My tasks: ${JSON.stringify(summary)}\n\nMy question: ${question}`
    : `My tasks: ${JSON.stringify(summary)}\n\nGive me your top 3 productivity observations and one action I should take right now.`;

  const advice = await callClaude(system, userMessage);
  res.json({ advice });
}

// POST /api/ai/prioritize
// Suggest which task to work on next
async function suggestNext(req, res) {
  const tasks = readTasks().filter(t => t.status !== 'done');

  if (tasks.length === 0) {
    return res.json({ suggestion: "🎉 All tasks are done! Time to add new goals.", taskId: null });
  }

  const system = `You are a task prioritization expert. Given a list of tasks, pick ONE to work on next and explain why in one sentence.
Respond ONLY with JSON: { "taskId": "string", "reason": "string" }`;

  const userMessage = JSON.stringify(tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    subtasksDone: t.subtasks.filter(s => s.done).length,
    subtasksTotal: t.subtasks.length,
  })));

  const raw = await callClaude(system, userMessage);
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch {
    res.status(500).json({ error: 'AI returned invalid response', raw });
  }
}

module.exports = {
  breakdownTask: asyncHandler(breakdownTask),
  getCoaching: asyncHandler(getCoaching),
  suggestNext: asyncHandler(suggestNext),
};
