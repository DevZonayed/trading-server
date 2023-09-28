// Convert number to bd number format
const formatNumToBd = (number) => {
  let numRegExp = /^(\+8801)|(8801)|(01)|(1)/;
  return number.toString().replace(numRegExp, "01");
};

/**
 * This mathod will help to convert csv string to object
 * @param {String} csvString
 * @returns
 */
function csvStringToObject(csvString) {
  const lines = csvString.trim().split("\n");
  const headers = lines[0].split(",");

  const objects = lines.slice(1).map((line) => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index].trim();
    });
    return obj;
  });

  return objects;
}

module.exports = { formatNumToBd, csvStringToObject };
