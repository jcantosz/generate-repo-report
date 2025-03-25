import * as core from "@actions/core";
import SchemaValidator from "./schema-validator.js";

export function validateInputs(inputCsvPath, outputCsvPath, rulesConfig) {
  // Validate configuration using the schema-based validator
  core.info(`Validating input configuration`);
  const validator = new SchemaValidator();

  // Validate paths first
  const pathsResult = validator.validatePaths(inputCsvPath, outputCsvPath);
  if (!pathsResult.isValid) {
    pathsResult.errors.forEach((error) => core.error(error));
    throw new Error("Invalid file paths");
  }

  // Validate against JSON schema
  const validationResult = validator.validate(rulesConfig);
  if (!validationResult.isValid) {
    validationResult.errors.forEach((error) => core.error(error));
    throw new Error("Invalid configuration format");
  }
  validator.validateCSVColumns(rulesConfig, inputCsvPath);

  // Check for potential conflicts (warnings only)
  const warnings = validator.checkPotentialConflicts(rulesConfig);
  warnings.forEach((warning) => core.warning(warning));
}
