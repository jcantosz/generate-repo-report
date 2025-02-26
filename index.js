const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const repoStatsFilePath = "repo-stats.csv";
const migrationAuditFilePath = "migration-audit.csv";
const outputCsvFilePath = "output.csv";

// All the 'type's in the migration audit output
const migrationTypes = new Set();

const readCsv = (filePath) => {
  return new Promise((resolve, reject) => {
    const data = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => data.push(row))
      .on("end", () => {
        console.log(`\tRead "${filePath}"`);
        resolve(data);
      })
      .on("error", (error) => reject(error));
  });
};

// Combine data from both CSV files
const combineStatsAndAuditData = (repoStatsData, migrationAuditData) => {
  migrationAuditData.forEach((row) => migrationTypes.add(row.type));

  // For each row of repoStats, find matching rows in migrationAudit
  // Create a new combined row and fill in data for each available migrationAudit header
  return repoStatsData.map((repoStatsRow) => {
    console.log(`\tProcessing "${repoStatsRow.Org_Name}/${repoStatsRow.Repo_Name}"`);

    const matchingRows = migrationAuditData.filter(
      (migrationAuditRow) =>
        repoStatsRow.Org_Name.toLowerCase() === migrationAuditRow.owner.toLowerCase() &&
        repoStatsRow.Repo_Name.toLowerCase() === migrationAuditRow.name.toLowerCase()
    );

    const combinedRow = { ...repoStatsRow, Has_Unmigratable: matchingRows.length > 0 };

    matchingRows.forEach((row) => {
      combinedRow[row.type] = true; // or row.message;
    });

    // Set remaining new rows to false
    migrationTypes.forEach((type) => {
      if (!combinedRow[type]) {
        combinedRow[type] = false;
      }
    });

    return combinedRow;
  });
};

const writeCsv = (filePath, headers, data) => {
  const csvWriter = createCsvWriter({
    path: filePath,
    header: headers.map((header) => ({ id: header, title: header })),
  });

  return csvWriter.writeRecords(data);
};

const processCsvFiles = async () => {
  try {
    console.log(`Reading input CSVs: "${repoStatsFilePath}", "${migrationAuditFilePath}"`);
    const [repoStatsData, migrationAuditData] = await Promise.all([
      readCsv(repoStatsFilePath),
      readCsv(migrationAuditFilePath),
    ]);

    console.log("Combining data");
    const combinedData = combineStatsAndAuditData(repoStatsData, migrationAuditData);

    const headers = [...Object.keys(repoStatsData[0]), "Has_Unmigratable", ...Array.from(migrationTypes)];

    console.log(`Writing "${outputCsvFilePath}"`);
    await writeCsv(outputCsvFilePath, headers, combinedData);

    console.log("The CSV file was written successfully");
  } catch (error) {
    console.error("Error processing CSV files:", error);
  }
};

processCsvFiles();
