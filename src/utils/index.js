/* eslint-disable default-case */
export const log = msg =>
  console.log(
    typeof (msg) === 'object'
      ? Object
        .entries(msg)
        .reduce(
          (acc, [label, value]) => ([
            ...acc,
            `${label}: ${typeof value === 'object' ? JSON.stringify(value) : value}`,
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

const hashCode = str => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const intToRGB = i => {
  const c = (i & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
};

export const getRandomColorWithName = name => {
  const hash = hashCode(name);
  const color = intToRGB(hash);
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

export const getReadableTimePeriodObject = milliseconds => {
  const units = [
    { unit: 'year', label: 'y', duration: 365.25 * 24 * 60 * 60 * 1000 },
    { unit: 'month', label: 'mo', duration: 30.44 * 24 * 60 * 60 * 1000 },
    { unit: 'day', label: 'd', duration: 24 * 60 * 60 * 1000 },
    { unit: 'hour', label: 'h', duration: 60 * 60 * 1000 },
    { unit: 'min', label: 'min', duration: 60 * 1000 },
    { unit: 'sec', label: 'sec', duration: 1000 },
    { unit: 'ms', label: 'ms', duration: 1 },
  ];

  return units
    .reduce((result, { unit, label, duration }) => {
      const value = Math.floor(milliseconds / duration);
      milliseconds %= duration;
      return {
        ...result,
        [unit]: value ? `${value}${label}` : '',
      };
    }, {});
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

export const addCommas = number =>
  number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const capitalizeSentence = sentence =>
  sentence
    .split(' ')
    .map(w =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(' ');

export const isLightColor = hexColor => {
  hexColor = hexColor.replace('#', '');

  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5;
};

export const convertTextToLink = text =>
  text?.replace(
    /(https?:\/\/[^\s()]+)/g,
    url => `<a target='_blank' rel='noreferrer' href='${url}'>${url}</a>`
  ) ?? '';

// Gray Tone Color
const COLOR_TYPE = {
  HEX_S: 'HEX_S',
  HEX: 'HEX',
  HEXA_S: 'HEXA_S',
  HEXA: 'HEXA',
  RGB: 'RGB',
  RGBA: 'RGBA',
  STR: 'STR',
};

const getColorType = color => {
  color = color.toLowerCase();
  if (color.startsWith('#')) {
    switch (color.length) {
      case 4:
        return COLOR_TYPE.HEX_S;
      case 7:
        return COLOR_TYPE.HEX;
      case 5:
        return COLOR_TYPE.HEXA_S;
      case 9:
        return COLOR_TYPE.HEXA;
    }
  } else if (color.startsWith('rgb')) {
    if (color.slice(0, 4) === 'rgba')
      return COLOR_TYPE.RGBA;
    return COLOR_TYPE.RGB;
  }
  return COLOR_TYPE.STR;
};

const getRGBA = (color, colorType) => {
  const rgba = [];
  switch (colorType) {
    case COLOR_TYPE.HEX_S:
    case COLOR_TYPE.HEXA_S:
      rgba.push(...color.slice(1).split('').map(h => parseInt(h.repeat(2), 16)));
      break;
    case COLOR_TYPE.HEX:
    case COLOR_TYPE.HEXA:
      rgba.push(...color.slice(1).match(/.{1,2}/g).map(h => parseInt(h, 16)));
      break;
    case COLOR_TYPE.RGB:
    case COLOR_TYPE.RGBA:
      rgba.push(...color.match(/[-+]?\d*\.?\d+/g).map(n => parseFloat(n)));
      break;
  }

  return rgba;
};

const convertColorType = (grayToneColor, colorType) => {
  switch (colorType) {
    case COLOR_TYPE.HEX:
    case COLOR_TYPE.HEX_S:
    case COLOR_TYPE.HEXA:
    case COLOR_TYPE.HEXA_S:
      return '#' + grayToneColor.map(n => n.toString(16).padStart(2, '0')).join('');
    case COLOR_TYPE.RGB:
      return `rgb(${grayToneColor.join(', ')})`;
    case COLOR_TYPE.RGBA:
      return `rgba(${grayToneColor.join(', ')})`;
  }
};

const getGrayToneWithPercentage = (rgb, percentage) => {
  const avgColor = rgb.reduce((a, n) => a + n) / 3;
  return rgb.map(n => Math.round(n - ((n - avgColor) * percentage)));
};

export const grayToneColor = (color, percentage = 1) => {
  const colorType = getColorType(color);
  if (colorType === COLOR_TYPE.STR)
    return color;

  const rgba = getRGBA(color, colorType);

  const grayToneColor = getGrayToneWithPercentage(rgba.slice(0, 3), percentage);

  if (rgba.length === 4)
    grayToneColor.push(rgba[3]);

  return convertColorType(grayToneColor, colorType);
};
