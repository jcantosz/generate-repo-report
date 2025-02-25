const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const repoStatsFile = "repo-stats.csv";
const migrationAuditFile = "migration-audit.csv";
const outputCsvFile = "output.csv";

const types = new Set();

const readCsvFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const data = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => data.push(row))
      .on("end", () => resolve(data))
      .on("error", (error) => reject(error));
  });
};

// Combine data from both CSV files
const combineData = (firstCsvData, secondCsvData) => {
  secondCsvData.forEach((row) => types.add(row.type));

  return firstCsvData.map((firstRow) => {
    const matchingRows = secondCsvData.filter(
      (secondRow) => firstRow.Org_Name === secondRow.owner && firstRow.Repo_Name === secondRow.name
    );

    const combinedRow = { ...firstRow, Has_Unmigratable: matchingRows.length > 0 };

    matchingRows.forEach((row) => {
      combinedRow[row.type] = true; // or row.message;
    });

    // Set remaining new rows to false
    types.forEach((type) => {
      if (!combinedRow[type]) {
        combinedRow[type] = false;
      }
    });

    return combinedRow;
  });
};

const writeCsvFile = (filePath, headers, data) => {
  const csvWriter = createCsvWriter({
    path: filePath,
    header: headers.map((header) => ({ id: header, title: header })),
  });

  return csvWriter.writeRecords(data);
};

const processCsvFiles = async () => {
  try {
    const [firstCsvData, secondCsvData] = await Promise.all([
      readCsvFile(repoStatsFile),
      readCsvFile(migrationAuditFile),
    ]);

    const combinedData = combineData(firstCsvData, secondCsvData);

    const headers = [...Object.keys(firstCsvData[0]), "Has_Unmigratable", ...Array.from(types)];

    await writeCsvFile(outputCsvFile, headers, combinedData);

    console.log("The CSV file was written successfully");
  } catch (error) {
    console.error("Error processing CSV files:", error);
  }
};

processCsvFiles();
