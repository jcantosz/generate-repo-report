/**
 * Main processor for CSV transformation
 */
import { getColumnsToProcess } from "./column-utils.js";
import { processRow } from "./rule-matcher.js";
import { addIndicatorColumns } from "./indicator-handler.js";

/**
 * Process CSV data using the provided rules
 * @param {Array} csvData - Array of objects representing CSV rows
 * @param {Object} rules - Rules configuration object
 * @returns {Array} - Processed CSV data
 */
function processCsvWithRules(csvData, rules) {
  // Extract rules array - ensuring it always exists
  const rulesArray = Array.isArray(rules.rules) ? rules.rules : [];

  const columnsToProcess = getColumnsToProcess(rules, csvData[0]);

  // Process each row
  return csvData.map((row) => processRow(row, columnsToProcess, rulesArray));
}

/**
 * Process CSV data with rules and add indicator columns
 * @param {Array} csvData - Input CSV data
 * @param {Object} rulesConfig - Rules configuration
 * @returns {Array} - Processed CSV data with indicator columns
 */
export function processData(csvData, rulesConfig) {
  // Process the CSV data using the rules
  const processedData = processCsvWithRules(csvData, rulesConfig);

  // Add indicator columns after processing the regular columns
  return addIndicatorColumns(processedData, rulesConfig);
}
