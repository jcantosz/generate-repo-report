const core = require('@actions/core');
const path = require('path');
const { readCsv, writeCsv } = require(path.join(__dirname, '../common/utils/csv-utils'));

async function main() {
  try {
    // Get inputs
    const baseCsvFilePath = core.getInput('base_csv_file');
    const additionalCsvFilePath = core.getInput('additional_csv_file');
    const outputCsvFilePath = core.getInput('output_file');
    const headerColumnKeys = core.getInput('header_column_keys');
    const headerColumnValues = core.getInput('header_column_values');
    const baseCsvColumns = core.getInput('base_csv_columns').split(',');
    const additionalCsvColumns = core.getInput('additional_csv_columns').split(',');

    core.info(`Reading input CSVs: "${baseCsvFilePath}", "${additionalCsvFilePath}"`);

    // Read the base CSV file
    const baseCsvData = await readCsv(baseCsvFilePath);
    core.info(`Read base CSV file: "${baseCsvFilePath}"`);

    // Read the additional CSV file
    const additionalCsvData = await readCsv(additionalCsvFilePath);
    core.info(`Read additional CSV file: "${additionalCsvFilePath}"`);

    core.info("Converting rows to columns");
    const { combinedData, migrationTypes } = rowsToColumns(baseCsvData, additionalCsvData, baseCsvColumns, additionalCsvColumns, headerColumnKeys, headerColumnValues);

    // Determine the headers for the output CSV file
    const headers = determineHeaders(baseCsvData, migrationTypes);
    core.info(`Determined headers for the output CSV file`);

    core.info(`Writing "${outputCsvFilePath}"`);
    await writeCsv(outputCsvFilePath, headers, combinedData);

    core.info("The CSV file was written successfully");
  } catch (error) {
    core.error("Error processing CSV files:", error);
    core.setFailed(error.message);
  }
}

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
function rowsToColumns(baseCsvData, additionalCsvData, baseCsvColumns, additionalCsvColumns, headerColumnKeys, headerColumnValues) {
  // Initialize a set to store unique types from header column
  const migrationTypes = new Set();

  // Add unique header values from the additional CSV data to the migrationTypes set
  additionalCsvData.forEach((row) => migrationTypes.add(row[headerColumnKeys]));

  const combinedData = baseCsvData.map((baseCsvRow) => {
    core.debug(`Processing "${baseCsvRow[baseCsvColumns[0]]}"`);

    // Find matching rows in the additional CSV data
    const matchingRows = additionalCsvData.filter((additionalCsvRow) =>
      baseCsvColumns.every((col, index) =>
        baseCsvRow[col].toLowerCase() === additionalCsvRow[additionalCsvColumns[index]].toLowerCase()
      )
    );

    // Create a new combined row and fill in data for each available additional CSV header
    const combinedRow = { ...baseCsvRow, Has_Unmigratable: matchingRows.length > 0 };

    // If the output displays a count, capture that, otherwise set the row to true
    matchingRows.forEach((row) => {
      const valuesDigits = row[headerColumnValues] ? row[headerColumnValues].match(/\d+/) : null;
      combinedRow[row[headerColumnKeys]] = valuesDigits ? valuesDigits[0] : "1+";
    });

    // Set remaining new rows to 0
    migrationTypes.forEach((type) => {
      if (!combinedRow[type]) {
        combinedRow[type] = 0;
      }
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
function determineHeaders(baseCsvData, migrationTypes) {
  return [...Object.keys(baseCsvData[0]), "Has_Unmigratable", ...Array.from(migrationTypes)];
}

main();