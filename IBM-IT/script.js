/**
 * script.js  —  Task List App
 * ============================================================
 * Features:
 *   • CRUD  : Create, Read (render), Update (inline edit), Delete
 *   • Toggle: Mark task as Active / Completed
 *   • Filter: All | Active | Completed  (no page reload)
 *   • Persistence: localStorage  (data survives page refresh)
 *   • Counter & "Clear completed" helper
 * ============================================================
 */

'use strict';

// ----------------------------------------------------------------
// 1.  DOM REFERENCES
// ----------------------------------------------------------------
const taskInput          = document.getElementById('taskInput');
const addBtn             = document.getElementById('addBtn');
const inputError         = document.getElementById('inputError');
const taskList           = document.getElementById('taskList');
const countAll           = document.getElementById('countAll');
const countActive        = document.getElementById('countActive');
const countCompleted     = document.getElementById('countCompleted');
const emptyState         = document.getElementById('emptyState');
const clearCompletedWrap = document.getElementById('clearCompletedWrap');
const clearCompletedBtn  = document.getElementById('clearCompletedBtn');
const filterBtns         = document.querySelectorAll('.filter-btn');

// ----------------------------------------------------------------
// 2.  APPLICATION STATE
// ----------------------------------------------------------------

/** @type {'all'|'active'|'completed'} */
let currentFilter = 'all';

/**
 * @typedef  {Object} Task
 * @property {string}  id          - Unique identifier (timestamp-based)
 * @property {string}  text        - Task description
 * @property {boolean} completed   - Completion status
 * @property {number}  createdAt   - Unix timestamp (ms)
 */

/** @type {Task[]} */
let tasks = [];

// ----------------------------------------------------------------
// 3.  PERSISTENCE  (localStorage)
// ----------------------------------------------------------------

/** Load tasks from localStorage on startup */
function loadTasks() {
  try {
    const stored = localStorage.getItem('taskListApp_tasks');
    tasks = stored ? JSON.parse(stored) : [];
  } catch {
    tasks = [];
  }
}

/** Persist current tasks array to localStorage */
function saveTasks() {
  localStorage.setItem('taskListApp_tasks', JSON.stringify(tasks));
}

// ----------------------------------------------------------------
// 4.  TASK  OPERATIONS  (pure data layer)
// ----------------------------------------------------------------

/**
 * Create and add a new task.
 * @param {string} text
 */
function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  /** @type {Task} */
  const newTask = {
    id:        `task_${Date.now()}`,
    text:      trimmed,
    completed: false,
    createdAt: Date.now(),
  };

  tasks.unshift(newTask); // newest first
  saveTasks();
}

/**
 * Delete a task by id.
 * @param {string} id
 */
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
}

/**
 * Toggle the completed status of a task.
 * @param {string} id
 */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
  }
}

/**
 * Update the text of an existing task.
 * @param {string} id
 * @param {string} newText
 */
function updateTask(id, newText) {
  const trimmed = newText.trim();
  if (!trimmed) return;

  const task = tasks.find(t => t.id === id);
  if (task) {
    task.text = trimmed;
    saveTasks();
  }
}

/**
 * Remove all completed tasks.
 */
function clearCompleted() {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
}

// ----------------------------------------------------------------
// 5.  DERIVED DATA
// ----------------------------------------------------------------

/** Return tasks filtered by the current filter value */
function getFilteredTasks() {
  switch (currentFilter) {
    case 'active':    return tasks.filter(t => !t.completed);
    case 'completed': return tasks.filter(t =>  t.completed);
    default:          return [...tasks];
  }
}

// ----------------------------------------------------------------
// 6.  RENDER  (DOM layer)
// ----------------------------------------------------------------

/**
 * Build the HTML for a single task item.
 * Returns an <li> Element (not inserted yet).
 * @param {Task} task
 * @returns {HTMLLIElement}
 */
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task-item bg-white rounded-2xl shadow-card px-4 py-3
    flex items-center gap-3 hover:shadow-card-hover transition-shadow`;
  li.dataset.id = task.id;

  // --- Checkbox ---
  const checkbox    = document.createElement('input');
  checkbox.type     = 'checkbox';
  checkbox.checked  = task.completed;
  checkbox.className = 'custom-checkbox';
  checkbox.setAttribute('aria-label', `Mark "${task.text}" as completed`);

  // --- Task text ---
  const span    = document.createElement('span');
  span.className = `task-text flex-1 text-sm leading-snug break-words
    ${task.completed ? 'completed' : ''}`;
  span.textContent = task.text;
  span.setAttribute('title', 'Double-click to edit');

  // --- Edit button ---
  const editBtn     = document.createElement('button');
  editBtn.type      = 'button';
  editBtn.className = 'shrink-0 p-1 rounded-lg text-gray-400 hover:text-primary transition-colors';
  editBtn.setAttribute('aria-label', 'Edit task');
  editBtn.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2"
         viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
            d="M15.232 5.232l3.536 3.536
               M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828
               a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
    </svg>`;

  // --- Delete button ---
  const deleteBtn     = document.createElement('button');
  deleteBtn.type      = 'button';
  deleteBtn.className = 'shrink-0 p-1 rounded-lg text-gray-400 hover:text-red-500 transition-colors';
  deleteBtn.setAttribute('aria-label', 'Delete task');
  deleteBtn.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2"
         viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858
               L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>`;

  // ---- EVENTS on this list item ----

  // Toggle completion
  checkbox.addEventListener('change', () => {
    toggleTask(task.id);
    render();
  });

  // Start editing on button click
  editBtn.addEventListener('click', () => startEdit(li, task));

  // Start editing on double-click on the text span
  span.addEventListener('dblclick', () => startEdit(li, task));

  // Delete with exit animation
  deleteBtn.addEventListener('click', () => {
    li.classList.add('removing');
    // Wait for animation before actually removing from DOM
    li.addEventListener('animationend', () => {
      deleteTask(task.id);
      render();
    }, { once: true });
  });

  li.append(checkbox, span, editBtn, deleteBtn);
  return li;
}

/**
 * Activate inline edit mode on a task item.
 * Replaces the text span with an input field.
 * @param {HTMLLIElement} li
 * @param {Task} task
 */
function startEdit(li, task) {
  // Avoid double-editing
  if (li.querySelector('.edit-input')) return;

  const span    = li.querySelector('.task-text');
  const editBtn = li.querySelector('[aria-label="Edit task"]');

  // Create the inline input
  const input      = document.createElement('input');
  input.type       = 'text';
  input.className  = 'edit-input';
  input.value      = task.text;
  input.maxLength  = 150;

  // Replace span with input
  span.replaceWith(input);
  input.focus();
  input.select();

  // Change edit icon to a "save" (check) icon
  editBtn.setAttribute('aria-label', 'Save task');
  editBtn.innerHTML = `
    <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" stroke-width="2.5"
         viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
    </svg>`;

  /** Commit the edit */
  const commitEdit = () => {
    const newText = input.value.trim();
    if (newText && newText !== task.text) {
      updateTask(task.id, newText);
    }
    render();
  };

  // Save on Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  commitEdit();
    if (e.key === 'Escape') render(); // cancel — revert
  });

  // Save on blur (clicking elsewhere)
  input.addEventListener('blur', commitEdit, { once: true });

  // Save button click
  editBtn.addEventListener('click', commitEdit, { once: true });
}

/**
 * Update the count badge on each filter tab.
 * Reuses the already-computed tasks array — no new calculation needed.
 */
function updateCounter() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active    = total - completed;

  // Show "(n)" when there are tasks, empty string when list is empty
  countAll.textContent       = total     ? `(${total})`     : '';
  countActive.textContent    = active    ? `(${active})`    : '';
  countCompleted.textContent = completed ? `(${completed})` : '';
}

/**
 * Show or hide the "Clear completed" button.
 */
function updateClearCompleted() {
  const hasCompleted = tasks.some(t => t.completed);
  clearCompletedWrap.classList.toggle('hidden', !hasCompleted);
}

/**
 * Full re-render: clears the list and re-builds it from state.
 * Called after every state mutation.
 */
function render() {
  const filtered = getFilteredTasks();

  // Clear existing items
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
  } else {
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    filtered.forEach(task => {
      taskList.appendChild(createTaskElement(task));
    });
  }

  updateCounter();
  updateClearCompleted();
}

// ----------------------------------------------------------------
// 7.  EVENT HANDLERS  (UI layer)
// ----------------------------------------------------------------

/** Handle "Add" button click */
function handleAddTask() {
  const value = taskInput.value;

  if (!value.trim()) {
    // Show validation error
    inputError.classList.remove('hidden');
    taskInput.focus();
    return;
  }

  inputError.classList.add('hidden');
  addTask(value);
  taskInput.value = '';
  taskInput.focus();
  render();
}

/** Allow adding a task by pressing Enter in the input */
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleAddTask();
});

/** Hide validation error as soon as user starts typing */
taskInput.addEventListener('input', () => {
  if (taskInput.value.trim()) {
    inputError.classList.add('hidden');
  }
});

/** Add button click */
addBtn.addEventListener('click', handleAddTask);

/** Filter button clicks */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Update active state on buttons
    filterBtns.forEach(b => b.classList.remove('active-filter'));
    btn.classList.add('active-filter');

    currentFilter = /** @type {'all'|'active'|'completed'} */ (btn.dataset.filter);
    render();
  });
});

/** Clear completed tasks */
clearCompletedBtn.addEventListener('click', () => {
  clearCompleted();
  render();
});

// ----------------------------------------------------------------
// 8.  BOOTSTRAP
// ----------------------------------------------------------------
loadTasks();
render();
