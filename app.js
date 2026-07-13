const latitude = 51.1006;
const longitude = 6.1548;

const dateElement = document.getElementById("date");
const sunriseElement = document.getElementById("sunrise");
const sunsetElement = document.getElementById("sunset");
const daylenElement = document.getElementById("daylen");

const minDayElement = document.getElementById("minDay");
const minLenElement = document.getElementById("minLen");
const diffMinElement = document.getElementById("diffMin");

const maxDayElement = document.getElementById("maxDay");
const maxLenElement = document.getElementById("maxLen");
const diffMaxElement = document.getElementById("diffMax");

const progressTextElement = document.getElementById("progressText");
const progressPercentElement = document.getElementById("progressPercent");
const progressBarElement = document.getElementById("progressBar");
const progressMarkerElement = document.getElementById("progressMarker");
const trendElement = document.getElementById("trend");

const metaElement = document.getElementById("meta");
const refreshButton = document.getElementById("refresh");


function formatDate(date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}


function formatShortDate(date) {
  return new Intl.DateTimeFormat("de-DE", {
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


function formatDuration(milliseconds) {
  const totalSeconds = Math.round(Math.abs(milliseconds) / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours} Std. ${minutes} Min. ${seconds} Sek.`;
}


function formatDifference(milliseconds) {
  const totalSeconds = Math.round(Math.abs(milliseconds) / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} Std. ${minutes} Min. ${seconds} Sek.`;
  }

  if (minutes > 0) {
    return `${minutes} Min. ${seconds} Sek.`;
  }

  return `${seconds} Sek.`;
}


function getDayLength(date) {
  const times = SunCalc.getTimes(date, latitude, longitude);

  if (
    !times.sunrise ||
    !times.sunset ||
    Number.isNaN(times.sunrise.getTime()) ||
    Number.isNaN(times.sunset.getTime())
  ) {
    return null;
  }

  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    length: times.sunset.getTime() - times.sunrise.getTime()
  };
}


function findShortestAndLongestDay(year) {
  let shortestDay = null;
  let longestDay = null;

  const date = new Date(year, 0, 1, 12, 0, 0);

  while (date.getFullYear() === year) {
    const currentDate = new Date(date);
    const dayData = getDayLength(currentDate);

    if (dayData !== null) {
      if (
        shortestDay === null ||
        dayData.length < shortestDay.length
      ) {
        shortestDay = {
          date: currentDate,
          length: dayData.length
        };
      }

      if (
        longestDay === null ||
        dayData.length > longestDay.length
      ) {
        longestDay = {
          date: currentDate,
          length: dayData.length
        };
      }
    }

    date.setDate(date.getDate() + 1);
  }

  return {
    shortestDay,
    longestDay
  };
}


function isDayLengthIncreasing(today) {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayData = getDayLength(today);
  const tomorrowData = getDayLength(tomorrow);

  if (todayData === null || tomorrowData === null) {
    return null;
  }

  return tomorrowData.length >= todayData.length;
}


function updateProgress(
  todayLength,
  shortestLength,
  longestLength,
  increasing
) {
  const totalRange = longestLength - shortestLength;
  const currentRange = todayLength - shortestLength;

  let percentage = 0;

  if (totalRange > 0) {
    percentage = (currentRange / totalRange) * 100;
  }

  percentage = Math.max(0, Math.min(100, percentage));

  progressBarElement.style.width = `${percentage}%`;
  progressMarkerElement.style.left = `${percentage}%`;

  progressPercentElement.textContent =
    `${percentage.toFixed(1).replace(".", ",")} %`;

  progressTextElement.textContent =
    `${formatDifference(currentRange)} mehr Tageslicht als am kürzesten Tag`;

  if (increasing === true) {
    trendElement.textContent = "Die Tage werden länger ↑";
  } else if (increasing === false) {
    trendElement.textContent = "Die Tage werden kürzer ↓";
  } else {
    trendElement.textContent = "Jahresverlauf";
  }
}


function calculate() {
  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0
  );

  const todayData = getDayLength(today);

  if (todayData === null) {
    metaElement.textContent =
      "Die Sonnenzeiten konnten nicht berechnet werden.";

    return;
  }

  const yearData = findShortestAndLongestDay(today.getFullYear());

  dateElement.textContent = formatDate(today);
  sunriseElement.textContent = formatTime(todayData.sunrise);
  sunsetElement.textContent = formatTime(todayData.sunset);
  daylenElement.textContent = formatDuration(todayData.length);

  if (yearData.shortestDay !== null) {
    minDayElement.textContent =
      formatShortDate(yearData.shortestDay.date);

    minLenElement.textContent =
      formatDuration(yearData.shortestDay.length);

    const differenceToShortest =
      todayData.length - yearData.shortestDay.length;

    if (Math.abs(differenceToShortest) < 1000) {
      diffMinElement.textContent =
        "Heute ist der kürzeste Tag";
    } else {
      diffMinElement.textContent =
        `${formatDifference(differenceToShortest)} länger`;
    }
  }

  if (yearData.longestDay !== null) {
    maxDayElement.textContent =
      formatShortDate(yearData.longestDay.date);

    maxLenElement.textContent =
      formatDuration(yearData.longestDay.length);

    const differenceToLongest =
      yearData.longestDay.length - todayData.length;

    if (Math.abs(differenceToLongest) < 1000) {
      diffMaxElement.textContent =
        "Heute ist der längste Tag";
    } else {
      diffMaxElement.textContent =
        `${formatDifference(differenceToLongest)} kürzer`;
    }
  }

  if (
    yearData.shortestDay !== null &&
    yearData.longestDay !== null
  ) {
    const increasing = isDayLengthIncreasing(today);

    updateProgress(
      todayData.length,
      yearData.shortestDay.length,
      yearData.longestDay.length,
      increasing
    );
  }

  metaElement.textContent =
    `Berechnet für Wassenberg bei ` +
    `${latitude.toFixed(4)}° N, ` +
    `${longitude.toFixed(4)}° E · ` +
    `Stand: ${formatTime(now)} Uhr`;
}


refreshButton.addEventListener("click", calculate);

calculate();
