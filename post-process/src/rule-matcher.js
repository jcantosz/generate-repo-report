/**
 * Functions for matching and applying rules to CSV data
 */
import { safeCompareValues } from "../../common/utils/csv-utils.js";

/**
 * Process a cell value according to the pattern and replacement rules
 * @param {string} value - The cell value to process
 * @param {RegExp} pattern - The pattern to match
 * @param {string} replacement - The replacement pattern
 * @param {string|boolean} fallback - Value to use if pattern doesn't match
 * @param {string|boolean} emptyValue - Value to use if input is empty
 * @returns {string|boolean} - The processed value
 */
function processCell(value, pattern, replacement, fallback, emptyValue) {
  // Check for undefined/null first
  if (value === undefined || value === null || String(value).trim() === "") {
    return emptyValue;
  }

  const match = pattern && value.match(pattern);
  if (match) {
    return replacement.replace(/\$(\d+)/g, (_, n) => match[n] || "");
  }
  return fallback;
}

/**
 * Check if a rule targets a specific column using case-insensitive comparison
 * @param {Array<string>} ruleColumns - Columns that the rule applies to
 * @param {string} columnName - The column name to check
 * @returns {boolean} - Whether the rule applies to the column
 */
function ruleAppliesToColumn(ruleColumns, columnName) {
  return ruleColumns.some((col) => {
    // Wildcard rule applies to all columns
    if (col === "*") {
      return true;
    }
    // Case-insensitive comparison for column names
    return safeCompareValues(col, columnName);
  });
}

/**
 * Find the most specific rule that applies to a column
 * @param {string} column - The column name
 * @param {Array} rules - Array of rule objects
 * @returns {Object} - The rule parameters to apply
 */
function findRuleForColumn(column, rules) {
  // Default parameters if no rule is found
  const defaults = {
    pattern: null,
    replacement: "$0",
    fallback: "1+",
    emptyValue: "0",
  };

  let wildcardRule = null;

  // Look for rules that target this column, starting from the end (last rule has precedence)
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];
    if (rule.columns && Array.isArray(rule.columns)) {
      // Check for direct column match using case-insensitive comparison
      if (ruleAppliesToColumn(rule.columns, column)) {
        return {
          pattern: rule.pattern ? new RegExp(rule.pattern) : defaults.pattern,
          replacement: rule.replacement || defaults.replacement,
          fallback: rule.fallback !== undefined ? rule.fallback : defaults.fallback,
          emptyValue: rule.emptyValue !== undefined ? rule.emptyValue : defaults.emptyValue,
        };
      }

      // Store wildcard rule if found
      if (rule.columns.includes("*") && !wildcardRule) {
        wildcardRule = rule;
      }
    }
  }

  // If we found a wildcard rule, use it as fallback
  if (wildcardRule) {
    return {
      pattern: wildcardRule.pattern ? new RegExp(wildcardRule.pattern) : defaults.pattern,
      replacement: wildcardRule.replacement || defaults.replacement,
      fallback: wildcardRule.fallback !== undefined ? wildcardRule.fallback : defaults.fallback,
      emptyValue: wildcardRule.emptyValue !== undefined ? wildcardRule.emptyValue : defaults.emptyValue,
    };
  }

  return defaults;
}

/**
 * Process a single row according to the rules and columns to process
 * @param {Object} row - The row to process
 * @param {Array<string>} columnsToProcess - Array of column names to process
 * @param {Array} rules - Array of rules
 * @returns {Object} - The processed row
 */
export function processRow(row, columnsToProcess, rules) {
  const processedRow = { ...row };

  // Process each field in the row
  Object.keys(row).forEach((column) => {
    // Skip columns that are not in the process list if it's defined
    if (!columnsToProcess.includes(column)) {
      return;
    }

    const value = row[column];
    const rule = findRuleForColumn(column, rules);

    processedRow[column] = processCell(value, rule.pattern, rule.replacement, rule.fallback, rule.emptyValue);
  });

  return processedRow;
}

/**
 * Build a mapping of column names to rules for faster lookup
 * @param {Array} rules - Array of rule objects
 * @returns {Object} - Mapping of column names to their rule properties
 */
export function buildColumnRulesMap(rules) {
  const columnRulesMap = {};

  if (Array.isArray(rules)) {
    // Build map from array of rules objects with columns arrays
    rules.forEach((rule) => {
      if (rule.columns && Array.isArray(rule.columns)) {
        rule.columns.forEach((column) => {
          columnRulesMap[column] = {
            pattern: rule.pattern,
            replacement: rule.replacement,
            fallback: rule.fallback,
            emptyValue: rule.emptyValue,
          };
        });
      }
    });
  }

  return columnRulesMap;
}
