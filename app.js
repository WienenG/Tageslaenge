// Wassenberg (fix)
// Koordinaten: ~51.1013, 6.1555  (WGS84)
const LAT = 51.1013;
const LON = 6.1555;
const PLACE = "Wassenberg (DE)";
const TZ = "Europe/Berlin";

const $ = (id) => document.getElementById(id);

function fmtDate(d) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function fmtTime(d) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function pad2(n) { return String(n).padStart(2, "0"); }

function fmtDuration(ms) {
  const totalMinutes = Math.round(ms / 60000);
  const sign = totalMinutes < 0 ? "-" : "";
  const m = Math.abs(totalMinutes);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${sign}${hh}:${pad2(mm)} h`;
}

function dayStartLocal(date) {
  // "Mitternacht" in Europe/Berlin als Date-Objekt (UTC intern),
  // indem wir die lokalen Teile formatieren und neu bauen.
  // (Robust genug für dieses Projekt.)
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find(p => p.type === "year").value;
  const mo = parts.find(p => p.type === "month").value;
  const da = parts.find(p => p.type === "day").value;

  // Erzeuge Datum um 12:00 UTC, damit wir garantiert am "richtigen Tag" landen,
  // dann nehmen SunCalc für diesen Zeitpunkt (das Datum ist entscheidend).
  return new Date(`${y}-${mo}-${da}T12:00:00Z`);
}

function getTimesForDay(date) {
  const d = dayStartLocal(date);
  const t = SunCalc.getTimes(d, LAT, LON);
  // t.sunrise / t.sunset sind Date-Objekte
  return t;
}

function daylightLengthMs(times) {
  if (!(times.sunrise instanceof Date) || !(times.sunset instanceof Date)) return null;
  return times.sunset - times.sunrise;
}

function scanShortestDay(year) {
  // Wir iterieren alle Tage des Jahres und suchen die minimale Tageslänge.
  // Das ist genauer als "immer 21.12." (kann je nach Ort/Schaltjahr minimal variieren).
  const start = new Date(Date.UTC(year, 0, 1, 12, 0, 0));
  const end = new Date(Date.UTC(year + 1, 0, 1, 12, 0, 0));

  let best = null;

  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const times = SunCalc.getTimes(d, LAT, LON);
    const len = daylightLengthMs(times);
    if (len == null) continue;

    if (!best || len < best.len) {
      best = { date: new Date(d), len, times };
    }
  }
  return best;
}

function render() {
  const now = new Date();
  const year = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" }).format(now));

  const todayTimes = getTimesForDay(now);
  const todayLen = daylightLengthMs(todayTimes);

  const shortest = scanShortestDay(year);

  $("date").textContent = fmtDate(now);
  $("sunrise").textContent = fmtTime(todayTimes.sunrise);
  $("sunset").textContent = fmtTime(todayTimes.sunset);
  $("daylen").textContent = todayLen != null ? fmtDuration(todayLen) : "–";

  if (shortest) {
    $("minDay").textContent = fmtDate(shortest.date);
    $("minLen").textContent = fmtDuration(shortest.len);

    const diff = (todayLen ?? 0) - shortest.len;
    const diffLabel = diff >= 0 ? `+${fmtDuration(diff)}` : fmtDuration(diff);
    $("diff").textContent = diffLabel;
  } else {
    $("minDay").textContent = "–";
    $("minLen").textContent = "–";
    $("diff").textContent = "–";
  }

  $("meta").textContent = `${PLACE} · Lat ${LAT.toFixed(4)}, Lon ${LON.toFixed(4)} · Zeitzone ${TZ}`;
}

document.addEventListener("DOMContentLoaded", () => {
  render();
  $("refresh").addEventListener("click", render);
});
