const entryText = document.getElementById("entryText");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");

const ratingButtons = document.getElementById("ratingButtons");
const ratingValue = document.getElementById("ratingValue");

const randomButton = document.getElementById("randomButton");
const recallText = document.getElementById("recallText");
const recallMeta = document.getElementById("recallMeta");

const openGraphBtn = document.getElementById("openGraphBtn");
const openCalendarBtn = document.getElementById("openCalendarBtn");

const streakValue = document.getElementById("streakValue");
const streakDetail = document.getElementById("streakDetail");
const todayPositiveValue = document.getElementById("todayPositiveValue");

const graphTabBtn = document.getElementById("graphTabBtn");
const calendarTabBtn = document.getElementById("calendarTabBtn");
const graphView = document.getElementById("graphView");
const calendarView = document.getElementById("calendarView");
const dayView = document.getElementById("dayView");

const graphSvg = document.getElementById("graphSvg");
const graphSummary = document.getElementById("graphSummary");

const calendarGrid = document.getElementById("calendarGrid");
const monthLabel = document.getElementById("monthLabel");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const calendarSummary = document.getElementById("calendarSummary");

const selectedDaySummary = document.getElementById("selectedDaySummary");
const dayEntryList = document.getElementById("dayEntryList");
const backToCalendarBtn = document.getElementById("backToCalendarBtn");

let allEntries = [];
let selectedRating = null;
let selectedDate = todayISO();
let visibleMonth = (() => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
})();
let currentRecallEntry = null;
let messageTimer = null;
let insightsView = "graph";

function pad(value) {
  return String(value).padStart(2, "0");
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toLocalDate(dateLike) {
  if (dateLike instanceof Date) {
    return new Date(dateLike.getFullYear(), dateLike.getMonth(), dateLike.getDate());
  }

  const [year, month, day] = String(dateLike).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(dateLike) {
  const date = toLocalDate(dateLike);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(dateLike, amount) {
  const date = toLocalDate(dateLike);
  date.setDate(date.getDate() + amount);
  return date;
}

function diffDays(a, b) {
  const dateA = toLocalDate(a);
  const dateB = toLocalDate(b);
  return Math.round((dateB.getTime() - dateA.getTime()) / 86400000);
}

function formatLongDate(dateISO) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(toLocalDate(dateISO));
}

function formatMediumDate(dateISO) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(toLocalDate(dateISO));
}

function formatMonthLabel(dateLike) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric"
  }).format(toLocalDate(dateLike));
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function formatNumber(value) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1
  }).format(value);
}

function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `entry_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function setMessage(text, tone = "tone-muted", autoClear = true) {
  if (!message) {
    return;
  }

  message.className = `message ${tone}`;
  message.textContent = text;

  if (messageTimer) {
    clearTimeout(messageTimer);
  }

  if (autoClear) {
    messageTimer = window.setTimeout(() => {
      message.textContent = "";
      message.className = "message";
    }, 3500);
  }
}

function clearSelectedRating() {
  selectedRating = null;

  if (ratingValue) {
    ratingValue.textContent = "—";
  }

  if (!ratingButtons) {
    return;
  }

  ratingButtons.querySelectorAll("button").forEach((button) => {
    button.classList.remove("selected");
    button.setAttribute("aria-pressed", "false");
  });
}

function setSelectedRating(rating, buttonElement) {
  selectedRating = rating;

  if (ratingValue) {
    ratingValue.textContent = String(rating);
  }

  ratingButtons.querySelectorAll("button").forEach((button) => {
    button.classList.remove("selected");
    button.setAttribute("aria-pressed", "false");
  });

  if (buttonElement) {
    buttonElement.classList.add("selected");
    buttonElement.setAttribute("aria-pressed", "true");
  }
}

function createRatingButtons() {
  if (!ratingButtons) {
    return;
  }

  ratingButtons.innerHTML = "";

  for (let i = 1; i <= 10; i += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(i);
    btn.setAttribute("aria-pressed", "false");

    btn.addEventListener("click", () => {
      setSelectedRating(i, btn);
    });

    ratingButtons.appendChild(btn);
  }
}

function getEntriesForDate(dateISO, kind = null) {
  return allEntries.filter((entry) => {
    const matchesDate = entry.date === dateISO;
    const matchesKind = kind ? entry.kind === kind : true;
    return matchesDate && matchesKind;
  });
}

function getPositiveEntries() {
  return allEntries.filter((entry) => entry.kind === "positive");
}

function buildCountMap(entries) {
  const map = new Map();

  for (const entry of entries) {
    map.set(entry.date, (map.get(entry.date) || 0) + 1);
  }

  return map;
}

function getPositiveDateSet() {
  return new Set(getPositiveEntries().map((entry) => entry.date));
}

function computeCurrentStreak(positiveDateSet) {
  let streak = 0;
  let cursor = todayISO();

  while (positiveDateSet.has(cursor)) {
    streak += 1;
    cursor = toISODate(addDays(cursor, -1));
  }

  return streak;
}

function createEntryItem(entry) {
  const item = document.createElement("li");
  item.className = "entry-item";

  const text = document.createElement("div");
  text.className = "entry-text";
  text.textContent = entry.text;

  const meta = document.createElement("div");
  meta.className = "entry-meta";

  const kindBadge = document.createElement("span");
  kindBadge.className = `badge ${entry.kind}`;
  kindBadge.textContent = entry.kind === "positive" ? "Positive" : "Archive";

  const rating = document.createElement("span");
  rating.textContent = `${entry.rating}/10`;

  const time = document.createElement("span");
  time.textContent = formatTime(entry.timestamp);

  meta.append(kindBadge, rating, time);
  item.append(text, meta);

  return item;
}

function renderEntryList(listElement, entries, emptyText) {
  listElement.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = emptyText;
    listElement.appendChild(empty);
    return;
  }

  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
  for (const entry of sorted) {
    listElement.appendChild(createEntryItem(entry));
  }
}

function renderHomeStats() {
  if (!streakValue || !streakDetail || !todayPositiveValue) {
    return;
  }

  const todayEntries = getEntriesForDate(todayISO());
  const todayPositives = todayEntries.filter((entry) => entry.kind === "positive").length;
  const positiveDateSet = getPositiveDateSet();
  const currentStreak = computeCurrentStreak(positiveDateSet);

  streakValue.textContent = String(currentStreak);
  streakDetail.textContent = currentStreak === 1 ? "day in a row" : "days in a row";
  todayPositiveValue.textContent = String(todayPositives);
}

function renderRandomRecall(forceNew = false) {
  if (!recallText || !recallMeta || !randomButton) {
    return;
  }

  const positiveEntries = getPositiveEntries();

  if (!positiveEntries.length) {
    currentRecallEntry = null;
    recallText.textContent = "Add a positive entry and I’ll pull one back at random.";
    recallMeta.textContent = "";
    randomButton.disabled = true;
    return;
  }

  randomButton.disabled = false;

  if (
    forceNew ||
    !currentRecallEntry ||
    !positiveEntries.some((entry) => entry.id === currentRecallEntry.id)
  ) {
    const randomIndex = Math.floor(Math.random() * positiveEntries.length);
    currentRecallEntry = positiveEntries[randomIndex];
  }

  recallText.textContent = currentRecallEntry.text;
  recallMeta.textContent = `${formatMediumDate(currentRecallEntry.date)} • ${formatTime(currentRecallEntry.timestamp)} • ${currentRecallEntry.rating}/10`;
}

function renderHome() {
  renderHomeStats();
  renderRandomRecall(false);
}

function renderGraph() {
  if (!graphSvg || !graphSummary) {
    return;
  }

  const positiveEntries = getPositiveEntries();
  const countMap = buildCountMap(positiveEntries);

  if (!positiveEntries.length) {
    graphSummary.textContent = "No positive entries yet.";
    graphSvg.innerHTML = "";
    return;
  }

  const spanDays = 30;
  const endDate = toLocalDate(todayISO());
  const startDate = addDays(endDate, -(spanDays - 1));

  const series = [];
  let maxValue = 0;

  for (let index = 0; index < spanDays; index += 1) {
    const day = addDays(startDate, index);
    let total = 0;

    for (let offset = -3; offset <= 3; offset += 1) {
      const neighbor = toISODate(addDays(day, offset));
      total += countMap.get(neighbor) || 0;
    }

    series.push({
      date: toISODate(day),
      value: total
    });

    maxValue = Math.max(maxValue, total);
  }

  const scaleMax = Math.max(1, Math.ceil(maxValue));

  const width = 1000;
  const height = 320;
  const pad = { top: 24, right: 28, bottom: 48, left: 56 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const step = innerWidth / (spanDays - 1);

  const points = series.map((item, index) => {
    const x = pad.left + (index * step);
    const y = pad.top + (innerHeight * (1 - (item.value / scaleMax)));
    return { x, y, value: item.value, date: item.date };
  });

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    linePath += ` L ${points[index].x} ${points[index].y}`;
  }

  let areaPath = `M ${points[0].x} ${pad.top + innerHeight} L ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    areaPath += ` L ${points[index].x} ${points[index].y}`;
  }
  areaPath += ` L ${points[points.length - 1].x} ${pad.top + innerHeight} Z`;

  const tickValues =
    scaleMax <= 4
      ? Array.from({ length: scaleMax + 1 }, (_, i) => i)
      : [0, Math.ceil(scaleMax / 2), scaleMax];

  const gridLines = tickValues.map((value) => {
    const y = pad.top + (innerHeight * (1 - (value / scaleMax)));
    return `
      <line class="graph-grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line>
      <text class="graph-axis-label y-axis-label" x="14" y="${y + 4}" text-anchor="start">${value}</text>
    `;
  }).join("");

  const labelIndexes = [0, Math.floor((spanDays - 1) / 2), spanDays - 1];

  const xLabels = labelIndexes.map((index) => {
    const point = points[index];
    const label = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(toLocalDate(point.date));
    return `<text class="graph-axis-label x-axis-label" x="${point.x}" y="${height - 14}" text-anchor="middle">${label}</text>`;
  }).join("");

  const dots = points
    .filter((_, index) => index % 5 === 0 || index === points.length - 1)
    .map((point) => `<circle class="graph-dot" cx="${point.x}" cy="${point.y}" r="6"></circle>`)
    .join("");

  const latestValue = points[points.length - 1].value;
  graphSummary.textContent = `Latest ${latestValue} • Peak ${maxValue}`;

  graphSvg.innerHTML = `
    <defs>
      <linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#58a6ff" stop-opacity="0.34"></stop>
        <stop offset="100%" stop-color="#58a6ff" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
    ${gridLines}
    <line class="graph-base" x1="${pad.left}" y1="${pad.top + innerHeight}" x2="${width - pad.right}" y2="${pad.top + innerHeight}"></line>
    <path class="graph-area" d="${areaPath}"></path>
    <path class="graph-line" d="${linePath}"></path>
    ${dots}
    ${xLabels}
  `;
}

function renderCalendar() {
  if (!calendarGrid || !monthLabel || !calendarSummary) {
    return;
  }

  const today = toLocalDate(todayISO());
  const year = visibleMonth.year;
  const month = visibleMonth.month;

  const monthStart = new Date(year, month, 1);
  const positiveEntries = getPositiveEntries();
  const positiveCountMap = buildCountMap(positiveEntries);
  const monthPositiveTotal = positiveEntries.filter((entry) => {
    const date = toLocalDate(entry.date);
    return date.getFullYear() === year && date.getMonth() === month;
  }).length;

  monthLabel.textContent = formatMonthLabel(monthStart);
  calendarSummary.textContent = `${pluralize(monthPositiveTotal, "positive note")} this month`;
  calendarGrid.innerHTML = "";

  const leadingOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -leadingOffset);

  for (let index = 0; index < 42; index += 1) {
    const day = addDays(gridStart, index);
    const iso = toISODate(day);
    const inMonth = day.getMonth() === month;
    const isToday = iso === toISODate(today);
    const isSelected = iso === selectedDate;
    const isFuture = toLocalDate(iso) > toLocalDate(todayISO());
    const count = positiveCountMap.get(iso) || 0;

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-cell";
    cell.setAttribute("aria-label", `${formatLongDate(iso)}. ${pluralize(count, "positive note")}.`);

    if (!inMonth) {
      cell.classList.add("other-month");
    }
    if (isToday) {
      cell.classList.add("today");
    }
    if (isSelected) {
      cell.classList.add("selected");
    }
    if (isFuture) {
      cell.classList.add("future");
      cell.disabled = true;
    }

    cell.innerHTML = `
      <div class="calendar-top">
        <span class="calendar-day">${day.getDate()}</span>
        ${count > 0 ? `<span class="calendar-count">${count > 9 ? "9+" : count}</span>` : ""}
      </div>
      <span class="calendar-note">${count > 0 ? "positive" : ""}</span>
    `;

    if (!isFuture) {
      cell.addEventListener("click", () => {
        openDayView(iso);
      });
    }

    calendarGrid.appendChild(cell);
  }

  if (prevMonthBtn) {
    prevMonthBtn.disabled = false;
  }

  if (nextMonthBtn) {
    nextMonthBtn.disabled =
      visibleMonth.year === today.getFullYear() &&
      visibleMonth.month === today.getMonth();
  }
}

function renderDayView() {
  if (!selectedDaySummary || !dayEntryList) {
    return;
  }

  const entries = getEntriesForDate(selectedDate);

  selectedDaySummary.textContent = `${formatLongDate(selectedDate)} • ${pluralize(entries.length, "entry")}`;

  renderEntryList(
    dayEntryList,
    entries,
    "No entries on this day."
  );
}

function setInsightsView(viewName) {
  insightsView = viewName;

  if (graphTabBtn && calendarTabBtn) {
    graphTabBtn.classList.toggle("is-active", viewName === "graph");
    calendarTabBtn.classList.toggle("is-active", viewName !== "graph");

    graphTabBtn.setAttribute("aria-selected", viewName === "graph" ? "true" : "false");
    calendarTabBtn.setAttribute("aria-selected", viewName !== "graph" ? "true" : "false");
  }

  if (graphView) {
    graphView.hidden = viewName !== "graph";
  }

  if (calendarView) {
    calendarView.hidden = viewName !== "calendar";
  }

  if (dayView) {
    dayView.hidden = true;
  }

  if (viewName === "graph") {
    renderGraph();
  }

  if (viewName === "calendar") {
    renderCalendar();
  }
}

function openDayView(dateISO) {
  selectedDate = dateISO;
  renderDayView();

  if (graphView) {
    graphView.hidden = true;
  }

  if (calendarView) {
    calendarView.hidden = true;
  }

  if (dayView) {
    dayView.hidden = false;
  }
}

function backToCalendarView() {
  setInsightsView("calendar");
  renderDayView();
}

function goToPreviousMonth() {
  const date = new Date(visibleMonth.year, visibleMonth.month, 1);
  date.setMonth(date.getMonth() - 1);

  visibleMonth = {
    year: date.getFullYear(),
    month: date.getMonth()
  };

  renderCalendar();
}

function goToNextMonth() {
  const today = new Date();
  const next = new Date(visibleMonth.year, visibleMonth.month, 1);
  next.setMonth(next.getMonth() + 1);

  if (
    next.getFullYear() > today.getFullYear() ||
    (next.getFullYear() === today.getFullYear() && next.getMonth() > today.getMonth())
  ) {
    return;
  }

  visibleMonth = {
    year: next.getFullYear(),
    month: next.getMonth()
  };

  renderCalendar();
}

function openInsightsPage(view = "graph") {
  const target = view === "calendar" ? "calendar" : "graph";
  window.location.href = `insights.html#${target}`;
}

function ratingOutcomeMessage(rating) {
  if (rating <= 4) {
    return { text: "Released. Not stored.", tone: "tone-muted" };
  }

  if (rating <= 6) {
    return { text: "Moved to archive.", tone: "tone-neutral" };
  }

  if (rating === 7) {
    return { text: "Saved to positives.", tone: "tone-positive" };
  }

  if (rating === 8) {
    return { text: "Good one. Kept.", tone: "tone-positive" };
  }

  if (rating === 9) {
    return { text: "Strong entry saved.", tone: "tone-positive" };
  }

  return { text: "Excellent. This one stays.", tone: "tone-positive" };
}

async function handleSubmit() {
  const text = entryText ? entryText.value.trim() : "";
  const rating = selectedRating;

  if (!text || rating === null) {
    setMessage("Add text and pick a rating first.", "tone-error");
    return;
  }

  const entry = {
    id: createId(),
    text,
    rating,
    date: todayISO(),
    timestamp: Date.now(),
    kind: rating <= 4 ? null : rating <= 6 ? "archive" : "positive"
  };

  const outcome = ratingOutcomeMessage(rating);

  if (rating <= 4) {
    setMessage(outcome.text, outcome.tone);
  } else {
    await addEntry(entry);
    allEntries.unshift(entry);
    setMessage(outcome.text, outcome.tone);
  }

  entryText.value = "";
  clearSelectedRating();

  renderHome();

  entryText.focus();
}

function setupHomePage() {
  createRatingButtons();
  renderHome();

  if (openGraphBtn) {
    openGraphBtn.addEventListener("click", () => openInsightsPage("graph"));
  }

  if (openCalendarBtn) {
    openCalendarBtn.addEventListener("click", () => openInsightsPage("calendar"));
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      handleSubmit().catch((error) => {
        console.error(error);
        setMessage("Could not save that entry.", "tone-error");
      });
    });
  }

  if (randomButton) {
    randomButton.addEventListener("click", () => {
      renderRandomRecall(true);
    });
  }
}

function setupInsightsPage() {
  const initialView = location.hash === "#calendar" ? "calendar" : "graph";

  if (graphTabBtn) {
    graphTabBtn.addEventListener("click", () => {
      history.replaceState(null, "", "#graph");
      setInsightsView("graph");
    });
  }

  if (calendarTabBtn) {
    calendarTabBtn.addEventListener("click", () => {
      history.replaceState(null, "", "#calendar");
      setInsightsView("calendar");
    });
  }

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      goToPreviousMonth();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      goToNextMonth();
    });
  }

  if (backToCalendarBtn) {
    backToCalendarBtn.addEventListener("click", () => {
      history.replaceState(null, "", "#calendar");
      backToCalendarView();
    });
  }

  window.addEventListener("hashchange", () => {
    const view = location.hash === "#calendar" ? "calendar" : "graph";
    setInsightsView(view);
  });

  selectedDate = todayISO();
  visibleMonth = {
    year: new Date().getFullYear(),
    month: new Date().getMonth()
  };

  setInsightsView(initialView);
  renderDayView();
}

function setup() {
  const isHomePage = Boolean(entryText || openGraphBtn || openCalendarBtn);
  const isInsightsPage = Boolean(graphTabBtn || calendarTabBtn || graphView || calendarView || dayView);

  if (isHomePage) {
    setupHomePage();
  }

  if (isInsightsPage) {
    setupInsightsPage();
  }
}

async function boot() {
  try {
    await initDB();
    allEntries = await getAllEntries();
    allEntries.sort((a, b) => b.timestamp - a.timestamp);
    setup();
  } catch (error) {
    console.error(error);
    setMessage("Could not open the database.", "tone-error", false);
  }
}

boot();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js")
    .then(() => console.log("Service Worker registered"))
    .catch((error) => console.warn("Service Worker registration failed:", error));
}