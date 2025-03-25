/**
 * Core functionality for converting rows to columns
 */
import * as core from "@actions/core";
import { safeCompareValues } from "../../common/utils/csv-utils.js";

/**
 * Convert rows from additional CSV into columns in base CSV
 * @param {Array} baseCsvData - Data from base CSV
 * @param {Array} additionalCsvData - Data from additional CSV
 * @param {Array} baseCsvColumns - Columns to match in base CSV
 * @param {Array} additionalCsvColumns - Columns to match in additional CSV
 * @param {string} headerColumnKeys - Column to use for header keys in additional CSV
 * @param {string} headerColumnValues - Column to use for header values in additional CSV
 * @returns {Object} - Combined data and set of migration types
 */
export function rowsToColumns(
  baseCsvData,
  additionalCsvData,
  baseCsvColumns,
  additionalCsvColumns,
  headerColumnKeys,
  headerColumnValues
) {
  // Initialize a set to store unique types from header column
  const migrationTypes = new Set();

  // Add unique header values from the additional CSV data to the migrationTypes set
  additionalCsvData.forEach((row) => migrationTypes.add(row[headerColumnKeys]));

  const combinedData = baseCsvData.map((baseCsvRow) => {
    core.debug(`Processing "${baseCsvRow[baseCsvColumns[0]]}"`);

    // Find matching rows in the additional CSV data
    const matchingRows = additionalCsvData.filter((additionalCsvRow) =>
      baseCsvColumns.every((col, index) =>
        safeCompareValues(baseCsvRow[col], additionalCsvRow[additionalCsvColumns[index]])
      )
    );

    // Create a new combined row
    const combinedRow = { ...baseCsvRow };

    // Simply store the raw message - post-processing will handle null values
    matchingRows.forEach((row) => {
      combinedRow[row[headerColumnKeys]] = row[headerColumnValues];
    });

    return combinedRow;
  });

  return { combinedData, migrationTypes };
}

/**
 * Determine headers for the output CSV file
 * @param {Array} baseCsvData - Data from base CSV
 * @param {Set} migrationTypes - Set of unique types from additional CSV
 * @returns {Array} - Headers for output CSV
 */
export function determineHeaders(baseCsvData, migrationTypes) {
  return [...Object.keys(baseCsvData[0]), ...Array.from(migrationTypes)];
}
