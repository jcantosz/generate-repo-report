/**
 * The entrypoint for the action. This file simply imports and runs the action's
 * main logic.
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as core from "@actions/core";
import { readCsv, writeCsv } from "../common/utils/csv-utils.js";
import { validateInputs } from "./src/validate.js";
import { processData } from "./src/processor.js";

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function run() {
  try {
    // Get inputs
    const inputCsvPath = core.getInput("input_csv");
    const outputCsvPath = core.getInput("output_csv");
    const rulesFilePath = core.getInput("rules_file");
    core.info(`Inputs:
      \tinputCSVPath: ${inputCsvPath}
      \toutputCSVPath: ${outputCsvPath}
      \trulesFilePath: ${rulesFilePath}\n`);

    // Read the rules configuration file
    core.debug(`Loading rules file at ${path.resolve(process.cwd(), rulesFilePath)}`);
    const rulesConfig = JSON.parse(await fs.readFile(path.resolve(process.cwd(), rulesFilePath), "utf8"));

    validateInputs(inputCsvPath, outputCsvPath, rulesConfig);

    // Read the CSV data
    const csvData = await readCsv(inputCsvPath);
    if (csvData.length === 0) {
      core.warning("Input CSV file is empty. No processing performed.");
      return;
    }

    // Process the CSV data using the extracted logic
    const dataWithIndicators = processData(csvData, rulesConfig);

    // Get headers from the data (including any new indicator columns)
    const headers = Object.keys(dataWithIndicators[0]);

    // Write the processed data to the output file
    await writeCsv(outputCsvPath, headers, dataWithIndicators);
    core.info(`Post-processing complete. Output written to ${outputCsvPath}`);
  } catch (error) {
    core.error(`Error in post-processing: ${error.message}`);
    core.setFailed(error.message);
    throw error;
  }
}

// Run the script if it's called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}
