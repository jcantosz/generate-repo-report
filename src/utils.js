const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const core = require('@actions/core');

const readCsv = (filePath) => {
  return new Promise((resolve, reject) => {
    const data = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => data.push(row))
      .on("end", () => {
        core.info(`Read "${filePath}"`);
        resolve(data);
      })
      .on("error", (error) => reject(error));
  });
};

const writeCsv = async (filePath, headers, data) => {
  const csvWriter = createCsvWriter({
    path: filePath,
    header: headers.map((header) => ({ id: header, title: header })),
  });
  await csvWriter.writeRecords(data);
};

const combineBaseAndAdditionalData = (baseCsvData, additionalCsvData, baseCsvColumns, additionalCsvColumns, headerColumn, mode) => {

  if (mode === 'direct') { // combine csvs directly
    core.info('Mode: direct');
    return combineDirectMode(baseCsvData, additionalCsvData, baseCsvColumns, additionalCsvColumns);
  }
  // else "default" mode where we combine the base CSV with the additional CSV using data in a column as new headers
  core.info('Mode: default');
  return combineDefaultMode(baseCsvData, additionalCsvData, baseCsvColumns, additionalCsvColumns, headerColumn);
};

const combineDirectMode = (baseCsvData, additionalCsvData, baseCsvColumns, additionalCsvColumns) => {
  const combinedData = baseCsvData.map((baseCsvRow) => {
    const combinedRow = { ...baseCsvRow };

    additionalCsvData.forEach((additionalCsvRow) => {
      if (baseCsvColumns.every((col, index) =>
        baseCsvRow[col].toLowerCase() === additionalCsvRow[additionalCsvColumns[index]].toLowerCase()
      )) {
        core.debug(`Matching row found for "${baseCsvRow.Org_Name}/${baseCsvRow.Repo_Name}"`);
        Object.keys(additionalCsvRow).forEach((key) => {
          if (!additionalCsvColumns.includes(key)) {
            combinedRow[key] = additionalCsvRow[key];
          }
        });
      }
    });

    return combinedRow;
  });

  return { combinedData, migrationTypes: new Set() };
};

const combineDefaultMode = (baseCsvData, additionalCsvData, baseCsvColumns, additionalCsvColumns, headerColumn) => {
  // Initialize a set to store unique migration types
  const migrationTypes = new Set();

  // Add unique header values from the additional CSV data to the migrationTypes set
  additionalCsvData.forEach((row) => migrationTypes.add(row[headerColumn]));

  const combinedData = baseCsvData.map((baseCsvRow) => {
    core.debug(`Processing "${baseCsvRow.Org_Name}/${baseCsvRow.Repo_Name}"`);

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
      const messageDigits = row.message ? row.message.match(/\d+/) : null;
      combinedRow[row[headerColumn]] = messageDigits ? messageDigits[0] : "1+";
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
};

const determineHeaders = (baseCsvData, additionalCsvData, additionalCsvColumns, mode, migrationTypes) => {
  if (mode === 'direct') {
    // Direct mode: combines the headers from the base CSV file and additional CSV file
    //    Gets the headers from the 0th row of both CSV files
    //    and filters out the additional CSV columns to avoid duplication
    return [...new Set([
      ...Object.keys(baseCsvData[0]),
      ...Object.keys(additionalCsvData[0]).filter(key => !additionalCsvColumns.includes(key))
    ])];
  } else {
    // Default mode: combining base CSV headers with additional headers and a custom header
    return [...Object.keys(baseCsvData[0]), "Has_Unmigratable", ...Array.from(migrationTypes)];
  }
};

module.exports = { readCsv, writeCsv, combineBaseAndAdditionalData, combineDirectMode, combineDefaultMode, determineHeaders };