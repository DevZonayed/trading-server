function isDate(date) {
  if (date == null) {
    return false;
  }
  return new Date(date).toString() !== "Invalid Date" && !isNaN(new Date(date));
}

function getPercentage(partialValue, totalValue) {
  return (100 * partialValue) / totalValue;
}

module.exports = { isDate, getPercentage };
