function parseStringToObject(inputString) {
  var lines = inputString.split("\n");
  var result = {};

  lines.forEach(function (line) {
    var parts = line.split("=");
    if (parts.length === 2) {
      var key = parts[0].trim();
      var value = parts[1].trim(); // Trim to remove leading/trailing spaces

      // Convert value to number if it's numeric
      if (!isNaN(value)) {
        value = parseFloat(value);
      }

      // Treat empty strings as null values
      if (value === "") {
        value = null;
      }

      result[key] = value;
    }
  });

  return result;
}

module.exports = { parseStringToObject };
