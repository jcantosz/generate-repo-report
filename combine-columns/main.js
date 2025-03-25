import * as core from "@actions/core";
import { readCsv, writeCsv } from "../common/utils/csv-utils.js";
import { combineColumns, determineHeaders } from "./src/processor.js";

export async function run() {
  try {
    // Get inputs
    const baseCsvFilePath = core.getInput("base_csv_file");
    const additionalCsvFilePath = core.getInput("additional_csv_file");
    const outputCsvFilePath = core.getInput("output_file");
    const baseCsvColumns = core.getInput("base_csv_columns").split(",");
    const additionalCsvColumns = core.getInput("additional_csv_columns").split(",");

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
