// This function will help to check the required data is present or not
function dataChecking({ keys, data }) {
  for (let i = 0; i < keys.length; i++) {
    if (!(keys[i] in data)) {
      return false;
    }
  }
  return true;
}

// Thin  function will help to check two array is same or all of the item of a array as another array or not
function checkArrayContainsAllItems({data , array}){
  try{
    for (let i = 0; i < data.length; i++) {
      if(!array.includes(data[i])){
        return false
      }
    }
    return true
  }catch(err){
    console.log(err)
  }
}


// Convert object to string
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
 *
 * @param {String / Number} inputTime Time
 * @param {Number} minutes Threshold
 * @returns
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
 * This function will help to generate timrange for filtering in multiple angle
 * @param {String / Number} time Last Candle Time
 * @param {Number} interval Candle Timeframe
 * @param { Number } candleCount Candle Time
 */
function generateMultiCandleTimeRange(
  inputTime,
  interval,
  candleCount,
  offset = 0
) {
  let inputTimeInMilliseconds;
  let totalMuniteThrashold = candleCount * (interval + offset);

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
  } else if (typeof inputTime === "object") {
    inputTimeInMilliseconds = new Date(inputTime).getTime();
  }

  if (isNaN(inputTimeInMilliseconds)) {
    return "Invalid date";
  }

  const startTime = new Date(
    inputTimeInMilliseconds - (totalMuniteThrashold - 0.5) * 60000
  );
  const endTime = new Date(
    inputTimeInMilliseconds + (0.5 - offset * interval) * 60000
  );
  return {
    startTime,
    endTime,
  };
}

/**
 * This function will gelp to generate mongoose quary for time range
 * @param {{ startTime , endTime}} rangeObject
 * @returns
 */
function generateDateRageFilterMongoose(rangeObject) {
  if (!rangeObject.startTime || !rangeObject.endTime) {
    return {};
  }

  return { $gte: rangeObject.startTime, $lte: rangeObject.endTime };
}

// Exporting all the utils
module.exports = {
  dataChecking,
  generateTimeRange,
  generateMultiCandleTimeRange,
  generateDateRageFilterMongoose,
  checkArrayContainsAllItems,
  objectToString
};
