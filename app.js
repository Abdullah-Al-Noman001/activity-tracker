"use strict";

const STORAGE_KEY = "habitTrackerData";
const HISTORY_DAYS = 112;
const EMPTY_DATA = () => ({ tasks: [], log: {} });

let data = loadSavedData();
let openHeatmapId = null;
let editingTaskId = null;

const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const globalGrid = document.getElementById("globalGrid");
const globalSummaryCard = document.getElementById("globalSummaryCard");
const statusMessage = document.getElementById("statusMessage");
const importFile = document.getElementById("importFile");

function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeData(value) {
    if (!isRecord(value) || !Array.isArray(value.tasks) || !isRecord(value.log)) {
        throw new Error("The backup format is not valid.");
    }

    const seenIds = new Set();
    const tasks = value.tasks.filter((task) => {
        if (!isRecord(task) || typeof task.id !== "string" || typeof task.name !== "string") return false;
        if (!task.id || !task.name.trim() || seenIds.has(task.id)) return false;
        seenIds.add(task.id);
        return true;
    }).map((task) => ({ id: task.id, name: task.name.trim() }));

    const log = {};
    for (const [date, entries] of Object.entries(value.log)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isRecord(entries)) continue;
        const completed = {};
        for (const task of tasks) {
            if (entries[task.id] === true) completed[task.id] = true;
        }
        if (Object.keys(completed).length) log[date] = completed;
    }
    return { tasks, log };
}

function loadSavedData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? normalizeData(JSON.parse(saved)) : EMPTY_DATA();
    } catch {
        return EMPTY_DATA();
    }
}

function showStatus(message) {
    statusMessage.textContent = message;
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch {
        showStatus("The browser could not save your data. Export a backup or free up browser storage.");
        return false;
    }
}

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function today() {
    return formatDate(new Date());
}

function generateUniqueId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function addTask(event) {
    event.preventDefault();
    const name = taskInput.value.trim();
    if (!name) return;

    data.tasks.push({ id: generateUniqueId(), name });
    taskInput.value = "";
    save();
    render();
    taskInput.focus();
}

function toggleTask(id, checked) {
    const date = today();
    if (!data.log[date]) data.log[date] = {};
    if (checked) data.log[date][id] = true;
    else delete data.log[date][id];
    if (Object.keys(data.log[date]).length === 0) delete data.log[date];

    save();
    renderGlobalHeatmap();
    if (openHeatmapId === id) renderHabitHeatmap(id);
}

function addHeatmapDay(grid, date, intensity, title) {
    const day = document.createElement("div");
    day.className = `day level${intensity}`;
    day.title = title;
    day.setAttribute("aria-label", title);
    grid.appendChild(day);
}

function getRecentDates() {
    const dates = [];
    const now = new Date();
    for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
        const date = new Date(now);
        date.setDate(date.getDate() - daysAgo);
        dates.push(formatDate(date));
    }
    return dates;
}

function renderGlobalHeatmap() {
    globalGrid.replaceChildren();
    if (data.tasks.length === 0) {
        globalSummaryCard.hidden = true;
        return;
    }

    globalSummaryCard.hidden = false;
    for (const date of getRecentDates()) {
        const count = data.tasks.reduce((total, task) => total + (data.log[date]?.[task.id] ? 1 : 0), 0);
        const intensity = count === 0 ? 0 : Math.ceil((count / data.tasks.length) * 4);
        addHeatmapDay(globalGrid, date, intensity, `${date}: ${count} ${count === 1 ? "habit" : "habits"} completed`);
    }
}

function renderHabitHeatmap(id) {
    const grid = document.getElementById(`grid-${id}`);
    const stats = document.getElementById(`hstats-${id}`);
    if (!grid || !stats) return;

    grid.replaceChildren();
    let completed = 0;
    for (const date of getRecentDates()) {
        const done = data.log[date]?.[id] === true;
        if (done) completed += 1;
        addHeatmapDay(grid, date, done ? 4 : 0, `${date}: ${done ? "completed" : "not completed"}`);
    }
    stats.textContent = `${completed} ${completed === 1 ? "day" : "days"} completed in the last 16 weeks`;
}

function createButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (className) button.className = className;
    button.addEventListener("click", onClick);
    return button;
}

function handleEdit(id) {
    editingTaskId = id;
    render();
    const input = document.getElementById(`edit-${id}`);
    input.focus();
    input.select();
}

function commitEdit(id) {
    const input = document.getElementById(`edit-${id}`);
    const task = data.tasks.find((item) => item.id === id);
    if (task && input && input.value.trim()) {
        task.name = input.value.trim();
        save();
    }
    editingTaskId = null;
    render();
}

function cancelEdit() {
    editingTaskId = null;
    render();
}

function toggleHistory(id) {
    openHeatmapId = openHeatmapId === id ? null : id;
    render();
    if (openHeatmapId === id) renderHabitHeatmap(id);
}

function deleteTask(id) {
    if (!window.confirm("Delete this habit?")) return;
    data.tasks = data.tasks.filter((task) => task.id !== id);
    for (const date of Object.keys(data.log)) {
        delete data.log[date][id];
        if (Object.keys(data.log[date]).length === 0) delete data.log[date];
    }
    if (openHeatmapId === id) openHeatmapId = null;
    if (editingTaskId === id) editingTaskId = null;
    save();
    render();
}

function renderTask(task) {
    const wrapper = document.createElement("div");
    wrapper.className = "task-wrapper";

    const row = document.createElement("div");
    row.className = "task";
    const left = document.createElement("div");
    left.className = "task-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = data.log[today()]?.[task.id] === true;
    checkbox.setAttribute("aria-label", `Mark ${task.name} complete for today`);
    checkbox.addEventListener("change", () => toggleTask(task.id, checkbox.checked));
    left.appendChild(checkbox);

    const isEditing = editingTaskId === task.id;
    if (isEditing) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "edit-input";
        input.id = `edit-${task.id}`;
        input.value = task.name;
        input.maxLength = 120;
        input.setAttribute("aria-label", `Edit ${task.name}`);
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") commitEdit(task.id);
            if (event.key === "Escape") cancelEdit();
        });
        left.appendChild(input);
    } else {
        const name = document.createElement("span");
        name.textContent = task.name;
        left.appendChild(name);
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";
    const historyButton = createButton(openHeatmapId === task.id ? "Close" : "History", "history-btn", () => toggleHistory(task.id));
    historyButton.setAttribute("aria-expanded", String(openHeatmapId === task.id));
    actions.appendChild(historyButton);

    if (isEditing) {
        actions.appendChild(createButton("Save", "", () => commitEdit(task.id)));
        actions.appendChild(createButton("Cancel", "", cancelEdit));
    } else {
        actions.appendChild(createButton("Edit", "edit-btn", () => handleEdit(task.id)));
    }
    actions.appendChild(createButton("Delete", "delete-btn", () => deleteTask(task.id)));
    row.append(left, actions);
    wrapper.appendChild(row);

    const panel = document.createElement("div");
    panel.className = `habit-heatmap-panel${openHeatmapId === task.id ? " open" : ""}`;
    panel.id = `panel-${task.id}`;
    panel.setAttribute("aria-label", `${task.name} completion history`);
    const heatmap = document.createElement("div");
    heatmap.className = "heatmap";
    const grid = document.createElement("div");
    grid.className = "grid";
    grid.id = `grid-${task.id}`;
    const stats = document.createElement("div");
    stats.className = "habit-stats";
    stats.id = `hstats-${task.id}`;
    heatmap.appendChild(grid);
    panel.append(heatmap, stats);
    wrapper.appendChild(panel);
    return wrapper;
}

function render() {
    taskList.replaceChildren();
    if (data.tasks.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No habits yet. Add one above to get started.";
        taskList.appendChild(empty);
    } else {
        for (const task of data.tasks) taskList.appendChild(renderTask(task));
    }
    renderGlobalHeatmap();
    if (openHeatmapId) renderHabitHeatmap(openHeatmapId);
}

function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "habit-backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showStatus("Backup downloaded.");
}

async function importData(file) {
    if (!file) return;
    try {
        const imported = normalizeData(JSON.parse(await file.text()));
        data = imported;
        openHeatmapId = null;
        editingTaskId = null;
        if (save()) {
            render();
            showStatus("Backup imported successfully.");
        }
    } catch {
        showStatus("Could not import that file. Choose a valid habit tracker JSON backup.");
    } finally {
        importFile.value = "";
    }
}

document.getElementById("addForm").addEventListener("submit", addTask);
document.getElementById("exportButton").addEventListener("click", exportData);
document.getElementById("importButton").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", () => importData(importFile.files[0]));

render();
