import * as core from "@actions/core";
import { readCsv, writeCsv } from "../common/utils/csv-utils.js";
import { rowsToColumns, determineHeaders } from "./src/processor.js";
import path from "path";
import { fileURLToPath } from "url";

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function run() {
  try {
    // Get inputs
    const baseCsvFilePath = core.getInput("base_csv_file");
    const additionalCsvFilePath = core.getInput("additional_csv_file");
    const outputCsvFilePath = core.getInput("output_file");
    const headerColumnKeys = core.getInput("header_column_keys");
    const headerColumnValues = core.getInput("header_column_values");
    const baseCsvColumns = core.getInput("base_csv_columns").split(",");
    const additionalCsvColumns = core.getInput("additional_csv_columns").split(",");

    core.info(`Reading input CSVs: "${baseCsvFilePath}", "${additionalCsvFilePath}"`);

    // Read the base CSV file
    const baseCsvData = await readCsv(baseCsvFilePath);
    core.info(`Read base CSV file: "${baseCsvFilePath}"`);

    // Read the additional CSV file
    const additionalCsvData = await readCsv(additionalCsvFilePath);
    core.info(`Read additional CSV file: "${additionalCsvFilePath}"`);

    core.info("Converting rows to columns");
    const { combinedData, migrationTypes } = rowsToColumns(
      baseCsvData,
      additionalCsvData,
      baseCsvColumns,
      additionalCsvColumns,
      headerColumnKeys,
      headerColumnValues
    );

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

// Run the script if it's called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}
