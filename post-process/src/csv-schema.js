import * as core from "@actions/core";
import { readCsv, safeCompareValues } from "../../common/utils/csv-utils.js";

/**
 * Get just the column headers from a CSV file
 * @param {string} csvPath - Path to the CSV file
 * @returns {Promise<Array<string>>} - Array of column headers
 */
export async function getCSVHeaders(csvPath) {
  try {
    const csvData = await readCsv(csvPath);
    if (!csvData || csvData.length === 0) {
      return [];
    }
    // Extract headers
    const headers = Object.keys(csvData[0]);
    return headers;
  } catch (error) {
    core.warning(`Failed to read CSV headers: ${error.message}`);
    return [];
  }
}

/**
 * Check if a header exists in the headers array using case-insensitive comparison
 * @param {string} columnName - Column name to check
 * @param {Array<string>} headers - Array of CSV headers
 * @returns {boolean} - Whether the column exists
 */
function headerExists(columnName, headers) {
  // Skip checking for wildcard
  if (columnName === "*") {
    return true;
  }

  // Use safeCompareValues for case-insensitive comparison
  return headers.some((header) => safeCompareValues(header, columnName));
}

/**
 * Validate that all columns referenced in rules exist in the CSV
 * @param {Object} rules - Rules configuration
 * @param {Array<string>} headers - CSV column headers
 * @returns {Object} - Validation result with isValid flag and any missing columns
 */
export function validateColumnExistence(rules, headers) {
  if (!rules || !headers || headers.length === 0) {
    return {
      isValid: false,
      missingColumns: [],
      message: "No CSV headers available for validation",
    };
  }

  const missingColumns = new Set();

  // Check rule columns
  if (rules.rules && Array.isArray(rules.rules)) {
    rules.rules.forEach((rule) => {
      if (!rule.columns || !Array.isArray(rule.columns)) return;

      // Find columns that don't exist in CSV using case-insensitive comparison
      rule.columns
        .filter((col) => col !== "*" && !headerExists(col, headers))
        .forEach((col) => missingColumns.add(col));
    });
  }

  // Check process columns
  if (rules.processColumns?.columns) {
    rules.processColumns.columns.filter((col) => !headerExists(col, headers)).forEach((col) => missingColumns.add(col));
  }

  // Check indicator source columns
  if (rules.indicatorColumns && Array.isArray(rules.indicatorColumns)) {
    rules.indicatorColumns.forEach((indicator) => {
      if (!indicator.sourceColumns) return;

      indicator.sourceColumns.filter((col) => !headerExists(col, headers)).forEach((col) => missingColumns.add(col));
    });
  }

  const missingColumnsArray = Array.from(missingColumns);
  return {
    isValid: missingColumnsArray.length === 0,
    missingColumns: missingColumnsArray,
    message:
      missingColumnsArray.length > 0
        ? `Configuration references columns that don't exist in the CSV: ${missingColumnsArray.join(", ")}`
        : "All referenced columns exist in the CSV",
  };
}
