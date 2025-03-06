const core = require('@actions/core');
const { readCsv, writeCsv, combineBaseAndAdditionalData, determineHeaders } = require('./src/utils');

const baseCsvFilePath = core.getInput('base_csv_file');
const additionalCsvFilePath = core.getInput('additional_csv_file');
const outputCsvFilePath = core.getInput('output_file');
const headerColumn = core.getInput('header_column');
const baseCsvColumns = core.getInput('base_csv_columns').split(',');
const additionalCsvColumns = core.getInput('additional_csv_columns').split(',');
const mode = core.getInput('mode') || 'default';

const processCsvFiles = async () => {
  try {
    core.info(`Reading input CSVs: "${baseCsvFilePath}", "${additionalCsvFilePath}"`);

    // Read the base CSV file
    core.info(`Reading base CSV file: "${baseCsvFilePath}"`);
    const baseCsvData = await readCsv(baseCsvFilePath);
    core.info(`Read base CSV file: "${baseCsvFilePath}"`);

    // Read the additional CSV file
    core.info(`Reading additional CSV file: "${additionalCsvFilePath}"`);
    const additionalCsvData = await readCsv(additionalCsvFilePath);
    core.info(`Read additional CSV file: "${additionalCsvFilePath}"`);

    core.info("Combining data");
    const { combinedData, migrationTypes } = combineBaseAndAdditionalData(baseCsvData, additionalCsvData, baseCsvColumns, additionalCsvColumns, headerColumn, mode);

    // Determine the headers for the output CSV file based on the selected mode
    core.info(`Determining headers for the output CSV file`);
    const headers = determineHeaders(baseCsvData, additionalCsvData, additionalCsvColumns, mode, migrationTypes);
    core.debug(`Combined headers: ${headers}`);
    core.info(`Determined headers for the output CSV file`);

    core.info(`Writing "${outputCsvFilePath}"`);
    await writeCsv(outputCsvFilePath, headers, combinedData);

    core.info("The CSV file was written successfully");
  } catch (error) {
    core.error("Error processing CSV files:", error);
    core.setFailed(error.message);
  }
};

processCsvFiles();
