const entryText = document.getElementById("entryText");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");
const positiveList = document.getElementById("positiveList");
const archiveList = document.getElementById("archiveList");
const ratingContainer = document.getElementById("ratingButtons");
const randomButton = document.getElementById("randomButton");
const recallText = document.getElementById("recallText");
const recallMeta = document.getElementById("recallMeta");
const todayBtn = document.getElementById("todayBtn");
const exportBtn = document.getElementById("exportBtn");
const datePicker = document.getElementById("datePicker");
const selectedDaySummary = document.getElementById("selectedDaySummary");
const calendarGrid = document.getElementById("calendarGrid");
const monthLabel = document.getElementById("monthLabel");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const calendarSummary = document.getElementById("calendarSummary");
const graphSvg = document.getElementById("graphSvg");
const graphSummary = document.getElementById("graphSummary");
const streakValue = document.getElementById("streakValue");
const streakDetail = document.getElementById("streakDetail");
const bestStreakValue = document.getElementById("bestStreakValue");
const todayPositiveValue = document.getElementById("todayPositiveValue");
const todayArchiveValue = document.getElementById("todayArchiveValue");

let allEntries = [];
let selectedRating = null;
let selectedDate = todayISO();
let visibleMonth = (() => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
})();
let currentRecallEntry = null;
let messageTimer = null;

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

function setSelectedRating(rating, buttonElement) {
  selectedRating = rating;

  document.querySelectorAll(".rating-buttons button").forEach((button) => {
    button.classList.remove("selected");
    button.setAttribute("aria-pressed", "false");
  });

  if (buttonElement) {
    buttonElement.classList.add("selected");
    buttonElement.setAttribute("aria-pressed", "true");
  }
}

function createRatingButtons() {
  ratingContainer.innerHTML = "";

  for (let rating = 0; rating <= 10; rating += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = rating;
    button.setAttribute("aria-pressed", "false");

    button.addEventListener("click", () => {
      setSelectedRating(rating, button);
    });

    ratingContainer.appendChild(button);
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

function getArchiveEntries() {
  return allEntries.filter((entry) => entry.kind === "archive");
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

function computeBestStreak(positiveDateSet) {
  const dates = Array.from(positiveDateSet).sort();
  if (dates.length === 0) {
    return 0;
  }

  let best = 1;
  let run = 1;

  for (let i = 1; i < dates.length; i += 1) {
    const previous = dates[i - 1];
    const current = dates[i];

    if (diffDays(previous, current) === 1) {
      run += 1;
    } else {
      run = 1;
    }

    best = Math.max(best, run);
  }

  return best;
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

function renderStats() {
  const todayEntries = getEntriesForDate(todayISO());
  const todayPositives = todayEntries.filter((entry) => entry.kind === "positive").length;
  const todayArchives = todayEntries.filter((entry) => entry.kind === "archive").length;
  const positiveDateSet = getPositiveDateSet();

  const currentStreak = computeCurrentStreak(positiveDateSet);
  const bestStreak = computeBestStreak(positiveDateSet);

  streakValue.textContent = String(currentStreak);
  streakDetail.textContent = currentStreak === 1 ? "day in a row" : "days in a row";
  bestStreakValue.textContent = String(bestStreak);
  todayPositiveValue.textContent = String(todayPositives);
  todayArchiveValue.textContent = String(todayArchives);
}

function renderSelectedDayView() {
  const positiveEntries = getEntriesForDate(selectedDate, "positive");
  const archiveEntries = getEntriesForDate(selectedDate, "archive");

  const positiveCount = positiveEntries.length;
  const archiveCount = archiveEntries.length;

  selectedDaySummary.textContent =
  `${formatLongDate(selectedDate)} • ${pluralize(positiveCount, "positive note")} • ${pluralize(archiveCount, "archive entry")}`;
  renderEntryList(
    positiveList,
    positiveEntries,
    "No positive notes on this day."
  );

  renderEntryList(
    archiveList,
    archiveEntries,
    "No archive entries on this day."
  );
}

function renderCalendar() {
  const today = toLocalDate(todayISO());
  const year = visibleMonth.year;
  const month = visibleMonth.month;

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

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
    const isFuture = diffDays(todayISO(), iso) < 0;
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
        goToDate(iso);
      });
    }

    calendarGrid.appendChild(cell);
  }

  nextMonthBtn.disabled = visibleMonth.year === today.getFullYear() && visibleMonth.month === today.getMonth();
}

function renderRandomRecall(forceNew = false) {
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

function renderGraph() {
  const positiveEntries = getPositiveEntries();
  const countMap = buildCountMap(positiveEntries);

  const spanDays = 30;
  const endDate = toLocalDate(todayISO());
  const startDate = addDays(endDate, -(spanDays - 1));

  const series = [];
  let maxValue = 1;

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

  const width = 1000;
  const height = 320;
  const pad = { top: 24, right: 28, bottom: 48, left: 56 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const step = innerWidth / (spanDays - 1);

  const points = series.map((item, index) => {
    const x = pad.left + (index * step);
    const y = pad.top + (innerHeight * (1 - (item.value / maxValue)));
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

  const gridValues = [0, Math.ceil(maxValue / 2), maxValue];

  const gridLines = gridValues.map((value) => {
    const y = pad.top + (innerHeight * (1 - (value / maxValue)));
    return `
      <line class="graph-grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line>
      <text class="graph-axis-label" x="16" y="${y + 7}">${value}</text>
    `;
  }).join("");

  const labelIndexes = [0, Math.floor((spanDays - 1) / 2), spanDays - 1];

  const xLabels = labelIndexes.map((index) => {
    const point = points[index];
    const label = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(toLocalDate(point.date));
    return `<text class="graph-axis-label" x="${point.x}" y="${height - 14}" text-anchor="middle">${label}</text>`;
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

function renderAll(options = {}) {
  renderStats();
  renderSelectedDayView();
  renderCalendar();
  renderGraph();
  renderRandomRecall(Boolean(options.forceRecall));
}

function goToDate(dateISO) {
  selectedDate = dateISO;
  datePicker.value = dateISO;

  const localDate = toLocalDate(dateISO);
  visibleMonth = {
    year: localDate.getFullYear(),
    month: localDate.getMonth()
  };

  renderAll({ forceRecall: false });
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
  const currentMonth = new Date();
  const next = new Date(visibleMonth.year, visibleMonth.month, 1);
  next.setMonth(next.getMonth() + 1);

  if (next.getFullYear() > currentMonth.getFullYear() || (next.getFullYear() === currentMonth.getFullYear() && next.getMonth() > currentMonth.getMonth())) {
    return;
  }

  visibleMonth = {
    year: next.getFullYear(),
    month: next.getMonth()
  };

  renderCalendar();
}

function exportEntries() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Journal",
    version: 1,
    entries: [...allEntries].sort((a, b) => a.timestamp - b.timestamp)
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `journal-export-${todayISO()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  setMessage("Exported JSON.", "tone-positive");
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
  const text = entryText.value.trim();
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
  setSelectedRating(null, null);

  document.querySelectorAll(".rating-buttons button").forEach((button) => {
    button.classList.remove("selected");
    button.setAttribute("aria-pressed", "false");
  });

  goToDate(todayISO());
  renderAll({ forceRecall: rating > 6 });
  entryText.focus();
}

function setup() {
  createRatingButtons();

  selectedDate = todayISO();
  visibleMonth = {
    year: new Date().getFullYear(),
    month: new Date().getMonth()
  };

  datePicker.value = selectedDate;
  datePicker.max = todayISO();

  entryText.focus();
  renderAll({ forceRecall: true });
}

submitBtn.addEventListener("click", () => {
  handleSubmit().catch((error) => {
    console.error(error);
    setMessage("Could not save that entry.", "tone-error");
  });
});

randomButton.addEventListener("click", () => {
  renderRandomRecall(true);
});

todayBtn.addEventListener("click", () => {
  goToDate(todayISO());
});

exportBtn.addEventListener("click", () => {
  exportEntries();
});

datePicker.addEventListener("change", () => {
  if (!datePicker.value) {
    return;
  }

  goToDate(datePicker.value);
});

prevMonthBtn.addEventListener("click", () => {
  goToPreviousMonth();
});

nextMonthBtn.addEventListener("click", () => {
  goToNextMonth();
});

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
    .then(() => console.log("Service Worker registered"));
}