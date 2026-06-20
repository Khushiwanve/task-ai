// ============================================
// TaskFlow AI — Frontend logic
// ============================================
const state = {
  tasks: [],
  currentFilter: 'all',
  editingTaskId: null,
  modalSubtasks: [],
};

// ---------- API helpers ----------
async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---------- Toast ----------
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type ? 'toast-' + type : ''}`;
  setTimeout(() => toast.classList.add('hidden'), 2800);
}

// ---------- Load + render ----------
async function loadTasks() {
  try {
    const { stats, tasks } = await api('/tasks');
    state.tasks = tasks;
    renderStats(stats);
    renderDashboard();
    renderTaskList();
  } catch (err) {
    showToast('Failed to load tasks: ' + err.message, 'error');
  }
}

function renderStats(stats) {
  document.getElementById('sb-total').textContent = stats.total;
  document.getElementById('sb-done').textContent = stats.done;
  document.getElementById('sb-inprogress').textContent = stats.inProgress;

  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-done').textContent = stats.done;
  document.getElementById('stat-inprogress').textContent = stats.inProgress;
  document.getElementById('stat-rate').textContent = stats.completionRate + '%';

  document.getElementById('progress-fill').style.width = stats.completionRate + '%';
  document.getElementById('progress-label').textContent = stats.completionRate + '%';

  const hour = new Date().getHours();
  const greetingText = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = `${greetingText} — here's your overview`;
}

function renderDashboard() {
  const recent = [...state.tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const container = document.getElementById('recent-tasks');
  renderTasksInto(container, recent, 'No tasks yet. Create your first one!', '✦');
}

function renderTaskList() {
  let filtered = [...state.tasks];
  if (state.currentFilter === 'todo') filtered = filtered.filter(t => t.status === 'todo');
  else if (state.currentFilter === 'in-progress') filtered = filtered.filter(t => t.status === 'in-progress');
  else if (state.currentFilter === 'done') filtered = filtered.filter(t => t.status === 'done');
  else if (state.currentFilter === 'high') filtered = filtered.filter(t => t.priority === 'high');

  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const container = document.getElementById('all-tasks');
  renderTasksInto(container, filtered, 'No tasks found.', '◇');
}

function renderTasksInto(container, tasks, emptyText, emptyIcon) {
  if (tasks.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">${emptyIcon}</div><p>${emptyText}</p></div>`;
    return;
  }

  container.innerHTML = tasks.map(t => taskCardHTML(t)).join('');

  // Wire up events
  tasks.forEach(t => {
    const checkEl = container.querySelector(`[data-check="${t.id}"]`);
    if (checkEl) checkEl.addEventListener('click', (e) => { e.stopPropagation(); toggleStatus(t); });

    const delEl = container.querySelector(`[data-delete="${t.id}"]`);
    if (delEl) delEl.addEventListener('click', (e) => { e.stopPropagation(); deleteTask(t.id); });

    const cardEl = container.querySelector(`[data-card="${t.id}"]`);
    if (cardEl) cardEl.addEventListener('click', () => openEditModal(t));
  });
}

function taskCardHTML(t) {
  const isDone = t.status === 'done';
  const subtaskDone = t.subtasks.filter(s => s.done).length;
  const subtaskTotal = t.subtasks.length;
  const subtaskPct = subtaskTotal ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;

  return `
    <div class="task-card" data-card="${t.id}">
      <div class="task-check ${isDone ? 'checked' : ''}" data-check="${t.id}">${isDone ? '✓' : ''}</div>
      <div class="task-content">
        <div class="task-title-row">
          <span class="task-title ${isDone ? 'done' : ''}">${escapeHTML(t.title)}</span>
          <span class="badge badge-${t.priority}">${t.priority}</span>
          ${t.aiGenerated ? '<span class="badge badge-ai">✦ AI</span>' : ''}
        </div>
        ${t.description ? `<div class="task-desc">${escapeHTML(t.description)}</div>` : ''}
        <div class="task-meta">
          ${t.dueDate ? `<span>📅 ${formatDate(t.dueDate)}</span>` : ''}
          ${t.estimatedMinutes ? `<span>⏱ ${formatMinutes(t.estimatedMinutes)}</span>` : ''}
          <span>🕐 ${formatDate(t.createdAt)}</span>
        </div>
        ${t.tags && t.tags.length ? `<div class="task-tags">${t.tags.map(tag => `<span class="tag-chip">${escapeHTML(tag)}</span>`).join('')}</div>` : ''}
        ${subtaskTotal ? `
          <div class="subtask-progress">
            <div class="subtask-track"><div class="subtask-fill" style="width:${subtaskPct}%"></div></div>
            <span class="subtask-count">${subtaskDone}/${subtaskTotal} subtasks</span>
          </div>` : ''}
      </div>
      <button class="task-delete" data-delete="${t.id}">✕</button>
    </div>
  `;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMinutes(min) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ---------- Task actions ----------
async function toggleStatus(task) {
  const newStatus = task.status === 'done' ? 'todo' : 'done';
  try {
    await api(`/tasks/${task.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    showToast(newStatus === 'done' ? 'Task completed ✓' : 'Task reopened', 'success');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await api(`/tasks/${id}`, { method: 'DELETE' });
    showToast('Task deleted', 'success');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------- Navigation ----------
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
  });
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentFilter = btn.dataset.filter;
    renderTaskList();
  });
});

// ---------- Modal ----------
const modal = document.getElementById('task-modal');

function openAddModal() {
  state.editingTaskId = null;
  state.modalSubtasks = [];
  document.getElementById('modal-title').textContent = 'New Task';
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-status').value = 'todo';
  document.getElementById('task-due').value = '';
  document.getElementById('task-tags').value = '';
  renderSubtaskRows();
  modal.classList.remove('hidden');
  document.getElementById('task-title').focus();
}

function openEditModal(task) {
  state.editingTaskId = task.id;
  state.modalSubtasks = task.subtasks.map(s => ({ ...s }));
  document.getElementById('modal-title').textContent = 'Edit Task';
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-desc').value = task.description || '';
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-status').value = task.status;
  document.getElementById('task-due').value = task.dueDate || '';
  document.getElementById('task-tags').value = (task.tags || []).join(', ');
  renderSubtaskRows();
  modal.classList.remove('hidden');
}

function closeModal() { modal.classList.add('hidden'); }

document.getElementById('open-add-modal').addEventListener('click', openAddModal);
document.getElementById('open-add-modal-2').addEventListener('click', openAddModal);
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('cancel-modal').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

function renderSubtaskRows() {
  const container = document.getElementById('subtasks-list');
  container.innerHTML = state.modalSubtasks.map((s, i) => `
    <div class="subtask-row">
      <input type="text" class="field-input" value="${escapeHTML(s.title)}" data-subtask-index="${i}" />
      <button class="subtask-remove" data-remove-index="${i}">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('[data-subtask-index]').forEach(input => {
    input.addEventListener('input', (e) => {
      state.modalSubtasks[+e.target.dataset.subtaskIndex].title = e.target.value;
    });
  });
  container.querySelectorAll('[data-remove-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.modalSubtasks.splice(+btn.dataset.removeIndex, 1);
      renderSubtaskRows();
    });
  });
}

document.getElementById('add-subtask').addEventListener('click', () => {
  state.modalSubtasks.push({ id: crypto.randomUUID(), title: '', done: false });
  renderSubtaskRows();
});

document.getElementById('save-task').addEventListener('click', async () => {
  const title = document.getElementById('task-title').value.trim();
  if (!title) { showToast('Title is required', 'error'); return; }

  const payload = {
    title,
    description: document.getElementById('task-desc').value.trim(),
    priority: document.getElementById('task-priority').value,
    status: document.getElementById('task-status').value,
    dueDate: document.getElementById('task-due').value || null,
    tags: document.getElementById('task-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    subtasks: state.modalSubtasks.filter(s => s.title.trim()),
  };

  try {
    if (state.editingTaskId) {
      await api(`/tasks/${state.editingTaskId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Task updated', 'success');
    } else {
      await api('/tasks', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Task created', 'success');
    }
    closeModal();
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ============================================
// AI Features
// ============================================

function setThinking(cardEl, btnEl, isThinking) {
  cardEl.classList.toggle('thinking', isThinking);
  btnEl.disabled = isThinking;
  btnEl.querySelector('.btn-text').classList.toggle('hidden', isThinking);
  btnEl.querySelector('.btn-loader').classList.toggle('hidden', !isThinking);
}

// --- Breakdown ---
document.getElementById('btn-breakdown').addEventListener('click', async () => {
  const goal = document.getElementById('breakdown-goal').value.trim();
  if (!goal) { showToast('Enter a goal first', 'error'); return; }
  const context = document.getElementById('breakdown-context').value.trim();

  const card = document.getElementById('btn-breakdown').closest('.ai-card');
  const btn = document.getElementById('btn-breakdown');
  const resultEl = document.getElementById('breakdown-result');
  resultEl.classList.add('hidden');
  setThinking(card, btn, true);

  try {
    const data = await api('/ai/breakdown', { method: 'POST', body: JSON.stringify({ goal, context }) });

    resultEl.innerHTML = `
      <div class="ai-result-title">${escapeHTML(data.title)}</div>
      <p style="color: var(--text-secondary); margin-bottom: 10px;">${escapeHTML(data.description || '')}</p>
      ${data.subtasks.map(s => `
        <div class="ai-subtask-item">
          <span>${escapeHTML(s.title)}</span>
          <span class="ai-subtask-time">${formatMinutes(s.estimatedMinutes || 0)}</span>
        </div>
      `).join('')}
      <button class="btn-primary" style="margin-top:14px;width:100%" id="accept-breakdown">+ Add as task</button>
    `;
    resultEl.classList.remove('hidden');

    document.getElementById('accept-breakdown').addEventListener('click', async () => {
      try {
        await api('/tasks', { method: 'POST', body: JSON.stringify(data) });
        showToast('AI task added!', 'success');
        loadTasks();
        document.getElementById('breakdown-goal').value = '';
        document.getElementById('breakdown-context').value = '';
        resultEl.classList.add('hidden');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  } catch (err) {
    resultEl.innerHTML = `<span class="ai-error">⚠ ${escapeHTML(err.message)}</span>`;
    resultEl.classList.remove('hidden');
  } finally {
    setThinking(card, btn, false);
  }
});

// --- Coach ---
document.getElementById('btn-coach').addEventListener('click', async () => {
  const question = document.getElementById('coach-question').value.trim();
  const card = document.getElementById('btn-coach').closest('.ai-card');
  const btn = document.getElementById('btn-coach');
  const resultEl = document.getElementById('coach-result');
  resultEl.classList.add('hidden');
  setThinking(card, btn, true);

  try {
    const data = await api('/ai/coach', { method: 'POST', body: JSON.stringify({ question }) });
    resultEl.innerHTML = `<div class="ai-result-title">💡 Coach says</div><p>${escapeHTML(data.advice)}</p>`;
    resultEl.classList.remove('hidden');
  } catch (err) {
    resultEl.innerHTML = `<span class="ai-error">⚠ ${escapeHTML(err.message)}</span>`;
    resultEl.classList.remove('hidden');
  } finally {
    setThinking(card, btn, false);
  }
});

// --- Suggest next ---
document.getElementById('btn-suggest').addEventListener('click', async () => {
  const card = document.getElementById('btn-suggest').closest('.ai-card');
  const btn = document.getElementById('btn-suggest');
  const resultEl = document.getElementById('suggest-result');
  resultEl.classList.add('hidden');
  setThinking(card, btn, true);

  try {
    const data = await api('/ai/suggest-next', { method: 'POST' });
    if (!data.taskId) {
      resultEl.innerHTML = `<div class="ai-result-title">${escapeHTML(data.suggestion)}</div>`;
    } else {
      const task = state.tasks.find(t => t.id === data.taskId);
      resultEl.innerHTML = `
        <div class="ai-result-title">🎯 ${escapeHTML(task ? task.title : 'Task')}</div>
        <p>${escapeHTML(data.reason)}</p>
      `;
    }
    resultEl.classList.remove('hidden');
  } catch (err) {
    resultEl.innerHTML = `<span class="ai-error">⚠ ${escapeHTML(err.message)}</span>`;
    resultEl.classList.remove('hidden');
  } finally {
    setThinking(card, btn, false);
  }
});

// ---------- Init ----------
loadTasks();
