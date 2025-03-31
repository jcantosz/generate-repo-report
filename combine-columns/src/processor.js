/**
 * Core functionality for combining columns from two CSV files
 */
import * as core from "@actions/core";
import { safeCompareValues } from "../../common/utils/csv-utils.js";

/**
 * Combine data from two CSV files by columns
 * @param {Array} baseCsvData - Data from base CSV
 * @param {Array} additionalCsvData - Data from additional CSV
 * @param {Array} baseCsvColumns - Columns to match in base CSV
 * @param {Array} additionalCsvColumns - Columns to match in additional CSV
 * @returns {Array} - Combined data
 */
export function combineColumns(baseCsvData, additionalCsvData, baseCsvColumns, additionalCsvColumns) {
  return baseCsvData.map((baseCsvRow) => {
    const combinedRow = { ...baseCsvRow };

    additionalCsvData.forEach((additionalCsvRow) => {
      if (
        baseCsvColumns.every((col, index) =>
          safeCompareValues(baseCsvRow[col], additionalCsvRow[additionalCsvColumns[index]])
        )
      ) {
        core.debug(`Matching row found for "${baseCsvRow[baseCsvColumns[0]]}"`);

        // Add all additional columns except the matching columns
        Object.keys(additionalCsvRow).forEach((key) => {
          if (!additionalCsvColumns.includes(key)) {
            combinedRow[key] = additionalCsvRow[key];
          }
        });
      }
    });

    return combinedRow;
  });
}

/**
 * Determine headers for the output CSV file
 * @param {Array} baseCsvData - Data from base CSV
 * @param {Array} additionalCsvData - Data from additional CSV
 * @param {Array} additionalCsvColumns - Columns to match in additional CSV
 * @returns {Array} - Headers for output CSV
 */
export function determineHeaders(baseCsvData, additionalCsvData, additionalCsvColumns) {
  return [
    ...new Set([
      ...Object.keys(baseCsvData[0]),
      ...Object.keys(additionalCsvData[0]).filter((key) => !additionalCsvColumns.includes(key)),
    ]),
  ];
}
