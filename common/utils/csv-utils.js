const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const core = require('@actions/core');

/**
 * Read a CSV file and parse its contents
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} - Array of objects representing CSV rows
 */
const readCsv = (filePath) => {
  return new Promise((resolve, reject) => {
    const data = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => data.push(row))
      .on("end", () => {
        core.info(`Read "${filePath}"`);
        resolve(data);
      })
      .on("error", (error) => reject(error));
  });
};

/**
 * Write data to a CSV file
 * @param {string} filePath - Path to the output CSV file
 * @param {Array} headers - Array of header names
 * @param {Array} data - Array of objects representing CSV rows
 * @returns {Promise<void>}
 */
const writeCsv = async (filePath, headers, data) => {
  const csvWriter = createCsvWriter({
    path: filePath,
    header: headers.map((header) => ({ id: header, title: header })),
  });
  await csvWriter.writeRecords(data);
};

module.exports = { readCsv, writeCsv };