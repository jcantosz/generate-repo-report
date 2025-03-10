const core = require('@actions/core');
const { readCsv, writeCsv } = require('../common/utils/csv-utils');

async function main() {
  try {
    // Get inputs
    const baseCsvFilePath = core.getInput('base_csv_file');
    const additionalCsvFilePath = core.getInput('additional_csv_file');
    const outputCsvFilePath = core.getInput('output_file');
    const baseCsvColumns = core.getInput('base_csv_columns').split(',');
    const additionalCsvColumns = core.getInput('additional_csv_columns').split(',');

    core.info(`Reading input CSVs: "${baseCsvFilePath}", "${additionalCsvFilePath}"`);

    // Read the base CSV file
    const baseCsvData = await readCsv(baseCsvFilePath);
    core.info(`Read base CSV file: "${baseCsvFilePath}"`);

    // Read the additional CSV file
    const additionalCsvData = await readCsv(additionalCsvFilePath);
    core.info(`Read additional CSV file: "${additionalCsvFilePath}"`);

    core.info("Combining data by columns");
    const combinedData = combineColumns(baseCsvData, additionalCsvData, baseCsvColumns, additionalCsvColumns);

    // Determine the headers for the output CSV file
    const headers = determineHeaders(baseCsvData, additionalCsvData, additionalCsvColumns);
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
 * Combine data from two CSV files by columns
 * @param {Array} baseCsvData - Data from base CSV
 * @param {Array} additionalCsvData - Data from additional CSV
 * @param {Array} baseCsvColumns - Columns to match in base CSV
 * @param {Array} additionalCsvColumns - Columns to match in additional CSV
 * @returns {Array} - Combined data
 */
function combineColumns(baseCsvData, additionalCsvData, baseCsvColumns, additionalCsvColumns) {
  return baseCsvData.map((baseCsvRow) => {
    const combinedRow = { ...baseCsvRow };

    additionalCsvData.forEach((additionalCsvRow) => {
      if (baseCsvColumns.every((col, index) =>
        baseCsvRow[col].toLowerCase() === additionalCsvRow[additionalCsvColumns[index]].toLowerCase()
      )) {
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
function determineHeaders(baseCsvData, additionalCsvData, additionalCsvColumns) {
  return [...new Set([
    ...Object.keys(baseCsvData[0]),
    ...Object.keys(additionalCsvData[0]).filter(key => !additionalCsvColumns.includes(key))
  ])];
}

main();