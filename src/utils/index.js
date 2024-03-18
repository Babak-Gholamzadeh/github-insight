export const log = msg =>
  console.log(
    typeof (msg) === 'object'
      ? Object
        .entries(msg)
        .reduce(
          (acc, [label, value]) => ([
            ...acc,
            `${label}: ${value}`,
          ]), [])
        .join(', ')
      : msg
  );

export const getRandomColor = (seed) => {
  const generateRandomNumber = (min, max) => {
    const range = max - min + 1;
    return Math.floor(seed * range) + min;
  };

  const getRandomHexDigit = () => {
    const hexDigits = '0123456789ABCDEF';
    return hexDigits[generateRandomNumber(0, 15)];
  };

  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += getRandomHexDigit();
  }

  return color;
};

export const getReadableTimePeriodShorter = milliseconds => {
  const units = [
    { label: 'y', duration: 365.25 * 24 * 60 * 60 * 1000 },
    { label: 'mo', duration: 30.44 * 24 * 60 * 60 * 1000 },
    { label: 'd', duration: 24 * 60 * 60 * 1000 },
    { label: 'h', duration: 60 * 60 * 1000 },
    { label: 'min', duration: 60 * 1000 },
  ];

  let result = units
    .map(unit => {
      const value = Math.floor(milliseconds / unit.duration);
      milliseconds %= unit.duration;
      return value ? `${value}${unit.label}` : '';
    })
    .filter(Boolean)
    .join(' ');

  return result || 'less than a min';
};

export const getReadableTimePeriod = milliseconds => {
  const units = [
    { label: 'year', duration: 365.25 * 24 * 60 * 60 * 1000 },
    { label: 'month', duration: 30.44 * 24 * 60 * 60 * 1000 },
    { label: 'day', duration: 24 * 60 * 60 * 1000 },
    { label: 'hour', duration: 60 * 60 * 1000 },
    { label: 'minute', duration: 60 * 1000 },
  ];

  let result = units
    .map(unit => {
      const value = Math.floor(milliseconds / unit.duration);
      milliseconds %= unit.duration;
      return value ? `${value} ${unit.label}${value === 1 ? '' : 's'}` : '';
    })
    .filter(Boolean)
    .join(' ');

  return result || 'less than a minute';
};

export const getHumanReadableTimeAgo = dateString => {
  const currentDate = new Date();
  const givenDate = new Date(dateString);

  const timeDifference = currentDate - givenDate;
  const seconds = Math.floor(timeDifference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30.44); // Average days in a month
  const years = Math.floor(days / 365.25); // Average days in a year

  if (years > 0) {
    return years === 1 ? 'a year ago' : `${years} years ago`;
  } else if (months > 0) {
    return months === 1 ? 'a month ago' : `${months} months ago`;
  } else if (days > 0) {
    return days === 1 ? 'a day ago' : `${days} days ago`;
  } else if (hours > 0) {
    return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  } else if (minutes > 0) {
    return minutes === 1 ? 'a minute ago' : `${minutes} minutes ago`;
  } else {
    return 'just now';
  }
};

const factor = 1e15;
export const createPrecisionErrHandler = smallestValue => r => {
  return parseInt(r, 10) + 1 - r < smallestValue ?
    Math.ceil(r) :
    Math.round(r * factor) / factor;
};
