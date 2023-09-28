function getDiffrenceOfUpperAndLowerForBB(upper, lower) {
  // Parse the values from strings to numbers
  const upperValue = parseFloat(upper);
  const lowerValue = parseFloat(lower);

  // Calculate the difference between upper and lower values
  const difference = upperValue - lowerValue;

  // Calculate the percentage difference
  const percentageDifference = (difference / lowerValue) * 100;

  return percentageDifference.toFixed(2);
}

module.exports = { getDiffrenceOfUpperAndLowerForBB };
