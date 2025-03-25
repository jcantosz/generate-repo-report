/**
 * Utilities for handling column selection and ranges
 */
import { safeCompareValues } from "../../common/utils/csv-utils.js";

/**
 * Finds a column in the sample row by name using case-insensitive comparison
 * @param {string} columnName - The column name to find
 * @param {Object} sampleRow - The sample row with column names as keys
 * @returns {string|null} - The actual column name from the sample row, or null if not found
 */
function findColumnInSampleRow(columnName, sampleRow) {
  const columnKeys = Object.keys(sampleRow);
  const matchingColumn = columnKeys.find((key) => safeCompareValues(key, columnName));
  return matchingColumn || null;
}

/**
 * Determine which columns should be processed based on rules configuration
 * @param {Object} rules - Rules configuration object
 * @param {Object} sampleRow - Sample row to get all available columns
 * @returns {Array<string>} - Array of column names to process
 */
export function getColumnsToProcess(rules, sampleRow) {
  if (!rules.processColumns) {
    // If no processColumns config is provided, process all columns
    return Object.keys(sampleRow);
  }

  let columnsToProcess = [];

  // Add columns specified by name with case-insensitive matching
  if (rules.processColumns.columns && Array.isArray(rules.processColumns.columns)) {
    rules.processColumns.columns.forEach((columnName) => {
      const actualColumnName = findColumnInSampleRow(columnName, sampleRow);
      if (actualColumnName) {
        columnsToProcess.push(actualColumnName);
      }
    });
  }

  // Add columns from ranges
  if (rules.processColumns.columnRanges && Array.isArray(rules.processColumns.columnRanges)) {
    columnsToProcess = [
      ...columnsToProcess,
      ...getColumnsByRange(rules.processColumns.columnRanges, Object.keys(sampleRow)),
    ];
  }

  // Remove duplicates and return
  return [...new Set(columnsToProcess)];
}

/**
 * Get columns from ranges specification
 * @param {Array<Object>} ranges - Array of range objects with start/end properties
 * @param {Array<string>} allColumns - All available column names
 * @returns {Array<string>} - Array of column names within the specified ranges
 */
export function getColumnsByRange(ranges, allColumns) {
  let columnsFromRanges = [];

  ranges.forEach((range) => {
    // Convert number to range object if needed
    const rangeObj = typeof range === "number" ? { start: range } : range;

    if (typeof rangeObj === "object") {
      const { start, end } = rangeObj;

      // If both start and end are undefined/null/not numbers, slice() will return a copy of the full array
      columnsFromRanges = [
        ...columnsFromRanges,
        ...allColumns.slice(typeof start === "number" ? start : undefined, typeof end === "number" ? end : undefined),
      ];
    }
  });

  return columnsFromRanges;
}

/**
 * Get columns to check for an indicator
 * @param {Object} indicator - The indicator configuration
 * @param {Array<string>} allColumns - All available columns
 * @returns {Array<string>} - List of columns to check
 */
export function getIndicatorSourceColumns(indicator, allColumns) {
  const { sourceColumns, sourceColumnRanges } = indicator;

  // If no source columns specified, check all columns
  if (!sourceColumns && !sourceColumnRanges) {
    return allColumns;
  }

  let columnsToCheck = [];

  // Add columns specified by name with case-insensitive matching
  if (sourceColumns && Array.isArray(sourceColumns)) {
    sourceColumns.forEach((columnName) => {
      const matchingColumn = allColumns.find((col) => safeCompareValues(col, columnName));
      if (matchingColumn) {
        columnsToCheck.push(matchingColumn);
      }
    });
  }

  // Add columns from ranges
  if (sourceColumnRanges && Array.isArray(sourceColumnRanges)) {
    columnsToCheck = [...columnsToCheck, ...getColumnsByRange(sourceColumnRanges, allColumns)];
  }

  return columnsToCheck;
}
