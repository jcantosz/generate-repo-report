/**
 * Handler for indicator columns functionality
 */
import { getIndicatorSourceColumns } from "./column-utils.js";
import { buildColumnRulesMap } from "./rule-matcher.js";

/**
 * Check if a row has any non-empty values in specified columns
 * @param {Object} row - The row to check
 * @param {Array<string>} columnsToCheck - Columns to check for values
 * @param {Object} columnRules - Column-specific rules
 * @param {string|boolean} defaultEmptyValue - Default empty value
 * @returns {boolean} - Whether any column has a non-empty value
 */
function hasNonEmptyValues(row, columnsToCheck, columnRules, defaultEmptyValue) {
  return columnsToCheck.some((col) => {
    const value = row[col];
    const emptyValue =
      columnRules[col] && columnRules[col].emptyValue !== undefined ? columnRules[col].emptyValue : defaultEmptyValue;

    return value !== undefined && value !== null && value !== "" && value !== emptyValue;
  });
}

/**
 * Process a single indicator for a row
 * @param {Object} row - The row being processed
 * @param {Object} indicator - The indicator configuration
 * @param {Array<string>} allColumns - All available columns
 * @param {Object} columnRules - Column-specific rules
 * @param {string|boolean} defaultEmptyValue - Default empty value
 * @returns {[string, any]} - Tuple of [indicator name, indicator value]
 */
function processIndicator(row, indicator, allColumns, columnRules, defaultEmptyValue) {
  const { name, trueValue, falseValue } = indicator;
  const columnsToCheck = getIndicatorSourceColumns(indicator, allColumns);
  const hasValue = hasNonEmptyValues(row, columnsToCheck, columnRules, defaultEmptyValue);

  return [name, hasValue ? trueValue : falseValue];
}

/**
 * Add indicator columns based on the state of source columns
 * @param {Array} csvData - Processed CSV data
 * @param {Object} rules - Rules configuration object
 * @returns {Array} - CSV data with indicator columns added
 */
export function addIndicatorColumns(csvData, rules) {
  if (!rules.indicatorColumns || !Array.isArray(rules.indicatorColumns) || rules.indicatorColumns.length === 0) {
    return csvData; // No indicator columns defined
  }

  // Find a default empty value from the rules array if possible
  const defaultRules =
    rules.rules && Array.isArray(rules.rules) && rules.rules.find((r) => r.columns && r.columns.includes("*"));
  const defaultEmptyValue = defaultRules && defaultRules.emptyValue !== undefined ? defaultRules.emptyValue : "0";

  const columnRules = buildColumnRulesMap(rules.rules || []);

  return csvData.map((row) => {
    const allColumns = Object.keys(row);
    const newRow = { ...row };

    rules.indicatorColumns.forEach((indicator) => {
      const [name, value] = processIndicator(row, indicator, allColumns, columnRules, defaultEmptyValue);
      newRow[name] = value;
    });

    return newRow;
  });
}
