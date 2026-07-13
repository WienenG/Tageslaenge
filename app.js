const LOCATION = {
  name: "Wassenberg",
  latitude: 51.1006,
  longitude: 6.1548
};

const $ = (id) => document.getElementById(id);

const elements = {
  date: $("date"),
  sunrise: $("sunrise"),
  sunset: $("sunset"),
  daylen: $("daylen"),
  trendToday: $("trendToday"),

  minDay: $("minDay"),
  minLen: $("minLen"),
  diffMin: $("diffMin"),

  maxDay: $("maxDay"),
  maxLen: $("maxLen"),
  diffMax: $("diffMax"),

  progressText: $("progressText"),
  progressPercent: $("progressPercent"),
  progressBar: $("progressBar"),
  progressMarker: $("progressMarker"),

  statusLine: $("statusLine"),
  meta: $("meta"),
  refresh: $("refresh")
};

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function atLocalNoon(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0
  );
}

function formatDate(date, withWeekday = false) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: withWeekday ? "long" : undefined,
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function splitDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.round(Math.abs(milliseconds) / 1000));

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };
}

function formatDuration(milliseconds, compact = false) {
  const { hours, minutes, seconds } = splitDuration(milliseconds);

  if (compact) {
    if (hours > 0) {
      return `${hours} h ${String(minutes).padStart(2, "0")} min`;
    }

    return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
  }

  return `${hours} Std. ${minutes} Min. ${seconds} Sek.`;
}

function getSolarData(date) {
  const times = SunCalc.getTimes(
    atLocalNoon(date),
    LOCATION.latitude,
    LOCATION.longitude
  );

  if (!isValidDate(times.sunrise) || !isValidDate(times.sunset)) {
    return null;
  }

  const length = times.sunset.getTime() - times.sunrise.getTime();

  if (!Number.isFinite(length) || length <= 0) {
    return null;
  }

  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    length
  };
}

function findYearExtremes(year) {
  let shortest = null;
  let longest = null;

  for (
    let date = new Date(year, 0, 1, 12, 0, 0, 0);
    date.getFullYear() === year;
    date.setDate(date.getDate() + 1)
  ) {
    const currentDate = new Date(date);
    const data = getSolarData(currentDate);

    if (!data) {
      continue;
    }

    const entry = {
      date: currentDate,
      length: data.length
    };

    if (!shortest || entry.length < shortest.length) {
      shortest = entry;
    }

    if (!longest || entry.length > longest.length) {
      longest = entry;
    }
  }

  if (!shortest || !longest) {
    throw new Error("Jahreswerte konnten nicht vollständig berechnet werden.");
  }

  return { shortest, longest };
}

function getDailyTrend(today) {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterdayData = getSolarData(yesterday);
  const tomorrowData = getSolarData(tomorrow);

  if (!yesterdayData || !tomorrowData) {
    return null;
  }

  return tomorrowData.length - yesterdayData.length;
}

function updateProgress(todayLength, shortestLength, longestLength) {
  const totalRange = longestLength - shortestLength;
  const currentRange = todayLength - shortestLength;

  const rawPercentage = totalRange > 0
    ? (currentRange / totalRange) * 100
    : 0;

  const percentage = Math.min(100, Math.max(0, rawPercentage));

  elements.progressBar.style.width = `${percentage}%`;
  elements.progressMarker.style.left = `${percentage}%`;
  elements.progressPercent.textContent =
    `${percentage.toFixed(1).replace(".", ",")} %`;

  elements.progressText.textContent =
    `${formatDuration(currentRange, true)} mehr Tageslicht als am kürzesten Tag`;
}

function calculate() {
  try {
    elements.statusLine.textContent = "Berechnung läuft …";

    const now = new Date();
    const today = atLocalNoon(now);
    const todayData = getSolarData(today);

    if (!todayData) {
      throw new Error("Die Sonnenzeiten für heute konnten nicht berechnet werden.");
    }

    const { shortest, longest } = findYearExtremes(today.getFullYear());

    elements.date.textContent = formatDate(today, true);
    elements.sunrise.textContent = formatTime(todayData.sunrise);
    elements.sunset.textContent = formatTime(todayData.sunset);
    elements.daylen.textContent = formatDuration(todayData.length, true);

    const dailyTrend = getDailyTrend(today);

    if (dailyTrend === null) {
      elements.trendToday.textContent = "Tendenz nicht verfügbar";
    } else if (Math.abs(dailyTrend) < 1000) {
      elements.trendToday.textContent = "Nahezu unverändert";
    } else if (dailyTrend > 0) {
      elements.trendToday.textContent =
        `Die Tage werden länger · etwa ${formatDuration(dailyTrend / 2, true)} pro Tag`;
    } else {
      elements.trendToday.textContent =
        `Die Tage werden kürzer · etwa ${formatDuration(dailyTrend / 2, true)} pro Tag`;
    }

    elements.minDay.textContent = formatDate(shortest.date);
    elements.minLen.textContent = formatDuration(shortest.length, true);

    const differenceToShortest = todayData.length - shortest.length;
    elements.diffMin.textContent =
      Math.abs(differenceToShortest) < 1000
        ? "Heute"
        : formatDuration(differenceToShortest, true);

    elements.maxDay.textContent = formatDate(longest.date);
    elements.maxLen.textContent = formatDuration(longest.length, true);

    const differenceToLongest = longest.length - todayData.length;
    elements.diffMax.textContent =
      Math.abs(differenceToLongest) < 1000
        ? "Heute"
        : formatDuration(differenceToLongest, true);

    updateProgress(
      todayData.length,
      shortest.length,
      longest.length
    );

    elements.statusLine.textContent = "Sonnenzeiten erfolgreich berechnet";
    elements.meta.textContent =
      `${LOCATION.name} · ${LOCATION.latitude.toFixed(4)}° N, ` +
      `${LOCATION.longitude.toFixed(4)}° E · aktualisiert um ${formatTime(now)} Uhr`;
  } catch (error) {
    console.error(error);

    elements.statusLine.textContent = "Berechnung fehlgeschlagen";
    elements.meta.textContent =
      error instanceof Error ? error.message : "Unbekannter Fehler";

    elements.progressText.textContent = "–";
    elements.progressPercent.textContent = "–";
  }
}

elements.refresh.addEventListener("click", calculate);

calculate();
