import fs from "fs";
import csv from "csv-parser";
import { createObjectCsvWriter } from "csv-writer";
import * as core from "@actions/core";

/**
 * Read a CSV file and parse its contents
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} - Array of objects representing CSV rows
 */
export function readCsv(filePath) {
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
}

/**
 * Write data to a CSV file
 * @param {string} filePath - Path to the output CSV file
 * @param {Array} headers - Array of header names
 * @param {Array} data - Array of objects representing CSV rows
 * @returns {Promise<void>}
 */
export async function writeCsv(filePath, headers, data) {
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers.map((header) => ({ id: header, title: header })),
  });
  await csvWriter.writeRecords(data);
}

/**
 * Safely compare two CSV cell values, handling null/undefined values
 * @param {any} value1 - First value to compare
 * @param {any} value2 - Second value to compare
 * @param {boolean} caseSensitive - Whether comparison should be case sensitive
 * @returns {boolean} - Whether the values match
 */
export function safeCompareValues(value1, value2, caseSensitive = false) {
  // Check if values exist
  if (value1 == null || value2 == null) {
    return false; // Skip comparison if either value is null/undefined
  }

  // Convert to string explicitly in case values are numbers or other types
  const stringVal1 = String(value1);
  const stringVal2 = String(value2);

  return caseSensitive ? stringVal1 === stringVal2 : stringVal1.toLowerCase() === stringVal2.toLowerCase();
}
