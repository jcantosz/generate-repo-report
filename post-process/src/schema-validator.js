import Ajv from "ajv";
import fs from "fs";
import path from "path";
import * as core from "@actions/core";
import schema from "../res/schema.json" assert { type: "json" };
import { getCSVHeaders, validateColumnExistence } from "./csv-schema.js";

/**
 * Schema-based validator for CSV post-processing configuration
 */
export default class SchemaValidator {
  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strictTuples: false,
    });
    this.validator = this.ajv.compile(schema);
  }

  /**
   * Validate a configuration object against the schema
   * @param {Object} config - Configuration object to validate
   * @returns {Object} Result object with isValid flag and any errors
   */
  validate(config) {
    const valid = this.validator(config);

    if (!valid) {
      return this.createValidationResult(false, this.formatErrors(this.validator.errors));
    }

    return this.createValidationResult(true);
  }

  /**
   * Format AJV errors into a more readable format
   * @param {Array} errors - AJV error objects
   * @returns {Array} Formatted error messages
   */
  formatErrors(errors) {
    return (errors || []).map((error) => {
      const path = error.instancePath.replace(/^\//, "").replace(/\//g, ".");
      const property = path || "config";

      switch (error.keyword) {
        case "required":
          return `Missing required property: ${error.params.missingProperty} in ${path || "config"}`;
        case "type":
          return `${property} must be a ${error.params.type}`;
        default:
          return `${property}: ${error.message}`;
      }
    });
  }

  /**
   * Check for potential conflicts or issues in the configuration
   * @param {Object} config - Rules configuration object
   * @returns {Array} Array of warning messages
   */
  checkPotentialConflicts(config) {
    const warnings = [];

    // Check for rule conflicts
    if (config.rules && Array.isArray(config.rules)) {
      this.checkWildcardRulePlacement(config.rules, warnings);
      this.checkDuplicateColumnRules(config.rules, warnings);
    }

    // Check for indicator column name conflicts
    if (config.indicatorColumns && Array.isArray(config.indicatorColumns)) {
      this.checkDuplicateIndicatorNames(config.indicatorColumns, warnings);
    }

    return warnings;
  }

  /**
   * Check if wildcard rule is not placed optimally
   * @param {Array} rules - Array of rule objects
   * @param {Array} warnings - Array to store warnings
   */
  checkWildcardRulePlacement(rules, warnings) {
    const wildcardRuleIndex = rules.findIndex(
      (rule) => rule.columns && Array.isArray(rule.columns) && rule.columns.includes("*")
    );

    if (wildcardRuleIndex > 0) {
      warnings.push("Wildcard rule (*) is not the first rule. Wildcard rules will override specific rules.");
    }
  }

  /**
   * Check for duplicate columns across different rules
   * @param {Array} rules - Array of rule objects
   * @param {Array} warnings - Array to store warnings
   */
  checkDuplicateColumnRules(rules, warnings) {
    const columnToRuleMap = new Map();

    rules.forEach((rule, index) => {
      if (!rule.columns || !Array.isArray(rule.columns)) return;

      rule.columns.forEach((column) => {
        if (column === "*") return; // Skip wildcard

        if (columnToRuleMap.has(column)) {
          warnings.push(`Column "${column}" appears in multiple rules. Rule at index ${index} will take precedence.`);
        }
        columnToRuleMap.set(column, index);
      });
    });
  }

  /**
   * Check for duplicate indicator column names
   * @param {Array} indicatorColumns - Array of indicator column configurations
   * @param {Array} warnings - Array to store warnings
   */
  checkDuplicateIndicatorNames(indicatorColumns, warnings) {
    const indicatorNames = indicatorColumns.map((ind) => ind.name);
    const duplicateNames = indicatorNames.filter((name, index) => indicatorNames.indexOf(name) !== index);

    if (duplicateNames.length > 0) {
      warnings.push(`Duplicate indicator column names found: ${duplicateNames.join(", ")}`);
    }
  }

  /**
   * Validate file paths exist
   * @param {string} inputCsvPath - Path to input CSV file
   * @param {string} outputCsvPath - Path to output CSV file
   * @returns {Object} Result object with isValid flag and any errors
   */
  validatePaths(inputCsvPath, outputCsvPath) {
    const errors = [];

    this.validateSinglePath(inputCsvPath, "input", errors);
    this.validateSinglePath(outputCsvPath, "output", true, errors);

    return this.createValidationResult(errors.length === 0, errors);
  }

  /**
   * Validate a single file path
   * @param {string} filePath - Path to validate
   * @param {string} type - Type of path ('input' or 'output')
   * @param {boolean} isDirectory - Whether to check for directory existence (for output)
   * @param {Array} errors - Array to collect errors
   */
  validateSinglePath(filePath, type, isDirectory = false, errors) {
    if (!filePath) {
      errors.push(`${type.charAt(0).toUpperCase() + type.slice(1)} CSV file path is required`);
      return;
    }

    try {
      const resolvedPath = path.resolve(filePath);

      if (isDirectory) {
        const dirPath = path.dirname(resolvedPath);
        if (!fs.existsSync(dirPath)) {
          errors.push(`${type.charAt(0).toUpperCase() + type.slice(1)} directory does not exist: ${dirPath}`);
        }
      } else if (!fs.existsSync(resolvedPath)) {
        errors.push(`${type.charAt(0).toUpperCase() + type.slice(1)} CSV file does not exist at path: ${resolvedPath}`);
      }
    } catch (error) {
      errors.push(`Error checking ${type} file: ${error.message}`);
    }
  }

  /**
   * Helper method to create a validation result object
   * @param {boolean} isValid - Whether the validation passed
   * @param {Array} errors - Array of error messages
   * @returns {Object} - Validation result object
   */
  createValidationResult(isValid, errors = []) {
    return {
      isValid,
      errors: isValid ? [] : errors,
    };
  }

  /**
   * Validate that all columns referenced in the rules configuration exist in the CSV
   * @param {Object} config - Rules configuration object
   * @param {string} csvPath - Path to the CSV file
   * @returns {Promise<Object>} - Result with isValid flag and any errors
   */
  async validateCSVColumns(config, csvPath) {
    // First validate that the CSV file exists
    const pathValidation = this.validatePaths(csvPath, null);
    if (!pathValidation.isValid) {
      return pathValidation;
    }

    // Get CSV headers
    const headers = await getCSVHeaders(csvPath);
    if (headers.length === 0) {
      return this.createValidationResult(false, ["Failed to read CSV headers or CSV has no columns"]);
    }

    // Validate column existence
    const validationResult = validateColumnExistence(config, headers);

    return {
      isValid: validationResult.isValid,
      errors: validationResult.isValid ? [] : [validationResult.message],
      missingColumns: validationResult.missingColumns,
      message: validationResult.message,
    };
  }
}
