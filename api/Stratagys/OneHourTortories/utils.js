/**
 * Validates if all specified keys are present in a given data object.
 *
 * @param {Object} param - The parameters object.
 * @param {string[]} param.keys - An array of keys to check in the data object.
 * @param {Object} param.data - The data object to validate against.
 * @returns {boolean} - True if all keys are present in the data object, otherwise false.
 */
function dataChecking({ keys, data }) {
  for (let i = 0; i < keys.length; i++) {
    if (!(keys[i] in data)) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if an array contains all elements of another array.
 *
 * @param {Object} param - An object containing the data and array to check.
 * @param {Array} param.data - The array of elements to be checked against.
 * @param {Array} param.array - The array to search within for the elements.
 * @returns {boolean} - Returns true if `param.array` contains all elements of `param.data`, otherwise false.
 */
function checkArrayContainsAllItems({ data, array }) {
  try {
    for (let i = 0; i < data.length; i++) {
      if (!array.includes(data[i])) {
        return false
      }
    }
    return true
  } catch (err) {
    console.log(err)
  }
}


/**
 * Serializes an object into a string with nested indentation.
 *
 * @param {Object} obj - The object to serialize.
 * @param {number} indent - The current indentation level (used internally).
 * @returns {string} The formatted object string.
 */
function objectToString(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let result = '';

  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      result += `${spaces}${key} =\n${objectToString(obj[key], indent + 1)}`;
    } else if (Array.isArray(obj[key])) {
      result += `${spaces}${key} = ${obj[key].join(' , ')}\n`;
    } else {
      result += `${spaces}${key} = ${obj[key]}\n`;
    }
  }

  return result;
}
/**
 * Generates a time range object based on a given input time and a number of minutes.
 *
 * The function accepts an input time as either a string in date format or a number as a timestamp,
 * and calculates the time range extending before and after the input time by the specified minutes.
 * The input timestamp can be in milliseconds or seconds (it handles both by checking the length of the number).
 *
 * @param {(string|number)} inputTime - The base time as a date string or a timestamp.
 * @param {number} minutes - The number of minutes to generate the time range around the input time.
 * @returns {(Object|string)} - An object with `startTime` and `endTime` as Date objects if input is valid,
 *                              or an error message string if the input time is invalid.
 */
function generateTimeRange(inputTime, minutes) {
  let inputTimeInMilliseconds;

  if (typeof inputTime === "string") {
    inputTimeInMilliseconds = new Date(inputTime).getTime();
  } else if (typeof inputTime === "number") {
    if (inputTime.toString().length === 13) {
      inputTimeInMilliseconds = inputTime;
    } else if (inputTime.toString().length === 10) {
      inputTimeInMilliseconds = inputTime * 1000;
    } else {
      return "Invalid timestamp";
    }
  }

  if (isNaN(inputTimeInMilliseconds)) {
    return "Invalid date";
  }

  const startTime = new Date(inputTimeInMilliseconds - minutes * 60000);
  const endTime = new Date(inputTimeInMilliseconds + minutes * 60000);

  return { startTime, endTime };
}

/**
 * Generates the start and end time range for multiple 'candles' based on a given input time, interval, and count.
 *
 * A 'candle' in financial contexts typically represents a time interval in trading data. This function 
 * calculates the time range that would encompass a specified number of such candles, each separated by a given
 * interval and an optional offset.
 *
 * @param {(string|number|Object)} inputTime - The central reference time as a date string, timestamp, or Date object.
 * @param {number} interval - The duration of each candle in minutes.
 * @param {number} candleCount - The number of candles to include in the range.
 * @param {number} [offset=0] - Additional minutes to offset each candle (default is 0).
 * @returns {(Object|string)} - An object containing `startTime` and `endTime` as Date objects if input is valid,
 *                              or an error message string if the input time is invalid.
 */
function generateMultiCandleTimeRange(candleDate, candleInterval, candleQty, offsetQty = 0, threshold = 20) {
  // Parse the candleDate into a Date object
  const endTime = new Date(candleDate);

  // Calculate the milliseconds for one candle
  const oneCandleMs = candleInterval * 60 * 1000;

  // Calculate the end date by subtracting the offset candles times the interval
  const offsetCandlesMs = offsetQty * oneCandleMs;
  const adjustedEndTime = new Date(endTime.getTime() - offsetCandlesMs);

  // Calculate the start date by subtracting the total candles times the interval from the adjusted end date
  const totalCandlesMs = candleQty * oneCandleMs;
  const startTime = new Date(adjustedEndTime.getTime() - totalCandlesMs);

  // Apply the threshold by subtracting from the startTime and adding to the adjustedEndTime
  const thresholdStartTime = new Date(startTime.getTime() - (threshold * 1000));
  const thresholdEndTime = new Date(adjustedEndTime.getTime() + (threshold * 1000));

  // Return the final range object with threshold applied
  return {
    startTime: thresholdStartTime.toISOString(),
    endTime: thresholdEndTime.toISOString()
  };
}


/**
 * Creates a Mongoose query filter object for a date range.
 *
 * This function constructs a filter object suitable for use with Mongoose
 * to find documents where a date field falls within a specified start and end time.
 * If either `startTime` or `endTime` is not provided in the `rangeObject`,
 * it returns an empty object which effectively applies no date filter in a Mongoose query.
 *
 * @param {Object} rangeObject - An object with `startTime` and `endTime` properties.
 * @returns {Object} A Mongoose filter object with `$gte` (greater than or equal) and `$lte`
 *                   (less than or equal) operators, or an empty object if `rangeObject` is incomplete.
 */
function generateDateRageFilterMongoose(rangeObject) {
  if (!rangeObject.startTime || !rangeObject.endTime) {
    return {};
  }

  return { $gte: rangeObject.startTime, $lte: rangeObject.endTime };
}

/**
 * Helper function to get the value from an object using a key path.
 * Handles nested keys using dot notation.
 * @param {Object} obj - The object from which to extract the value.
 * @param {String} keyPath - The key or path to the key (e.g., 'data.macdLine').
 * @returns {Number} - The value from the object at the specified key path.
 */
function getValueByKeyPath(obj, keyPath) {
  return keyPath.split('.').reduce((acc, part) => acc && acc[part], obj);
}

/**
 * Helper function to sort candles by time in descending order to ensure the latest candle comes first.
 * @param {Array} candles - Array of candle objects.
 * @returns {Array} - Sorted array of candle objects.
 */
function sortCandlesDescending(candles) {
  return candles.slice().sort((a, b) => new Date(b.time) - new Date(a.time));
}

/**
 * Check for an upper cross event. Single Line Cross
 * @param {Array} candles - Array of unsorted candle objects.
 * @param {String} keyPath - The key or path to the key for the value to check.
 * @returns {Boolean} - True if an upper cross event is found, false otherwise.
 */
function upperCross(candles, keyPath) {
  if (candles.length < 3) return false;
  const sortedCandles = sortCandlesDescending(candles);
  const [latestValue, prevValue, prevPrevValue] = sortedCandles.slice(0, 3).map(candle => getValueByKeyPath(candle, keyPath));
  return prevValue <= prevPrevValue && latestValue > prevValue;
}

/**
 * Check for an under cross event. Single Line cross
 * @param {Array} candles - Array of unsorted candle objects.
 * @param {String} keyPath - The key or path to the key for the value to check.
 * @returns {Boolean} - True if an under cross event is found, false otherwise.
 */
function underCross(candles, keyPath) {
  if (candles.length < 3) return false;
  const sortedCandles = sortCandlesDescending(candles);
  const [latestValue, prevValue, prevPrevValue] = sortedCandles.slice(0, 3).map(candle => getValueByKeyPath(candle, keyPath));
  return prevValue >= prevPrevValue && latestValue < prevValue;
}




/**
 * Checks if there's been a crossover between two keys within the same candle or between consecutive candles.
 * @param {Array} candles - Array of unsorted candle objects.
 * @param {String} keyAPath - The path to the first key.
 * @param {String} keyBPath - The path to the second key.
 * @returns {Boolean} - True if a crossover occurred, false otherwise.
 */
function crossover(candles, keyAPath, keyBPath) {
  if (candles.length < 2) return false;

  const sortedCandles = sortCandlesDescending(candles);
  const [latestCandle, prevCandle] = sortedCandles.slice(0, 2);

  const latestKeyAValue = getValueByKeyPath(latestCandle, keyAPath);
  const prevKeyAValue = getValueByKeyPath(prevCandle, keyAPath);
  const latestKeyBValue = getValueByKeyPath(latestCandle, keyBPath);
  const prevKeyBValue = getValueByKeyPath(prevCandle, keyBPath);

  return prevKeyAValue < prevKeyBValue && latestKeyAValue > latestKeyBValue;
}

/**
 * Checks if there's been a crossunder between two keys within the same candle or between consecutive candles.
 * @param {Array} candles - Array of unsorted candle objects.
 * @param {String} keyAPath - The path to the first key.
 * @param {String} keyBPath - The path to the second key.
 * @returns {Boolean} - True if a crossunder occurred, false otherwise.
 */
function crossunder(candles, keyAPath, keyBPath) {
  if (candles.length < 2) return false;

  const sortedCandles = sortCandlesDescending(candles);
  const [latestCandle, prevCandle] = sortedCandles.slice(0, 2);

  const latestKeyAValue = getValueByKeyPath(latestCandle, keyAPath);
  const prevKeyAValue = getValueByKeyPath(prevCandle, keyAPath);
  const latestKeyBValue = getValueByKeyPath(latestCandle, keyBPath);
  const prevKeyBValue = getValueByKeyPath(prevCandle, keyBPath);

  return prevKeyAValue > prevKeyBValue && latestKeyAValue < latestKeyBValue;
}













// Exporting all the utils
module.exports = {
  dataChecking,
  generateTimeRange,
  generateMultiCandleTimeRange,
  generateDateRageFilterMongoose,
  checkArrayContainsAllItems,
  objectToString,
  upperCross,
  underCross,
  crossover,
  crossunder,
  sortCandlesDescending
};
