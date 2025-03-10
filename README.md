# CSV Processing Actions

This repository contains two separate GitHub Actions for processing CSV files:

1. **Combine Columns** - Combines columns from two CSV files based on matching rows.
2. **Rows to Columns** - Converts rows from an additional CSV into columns in a base CSV.

The rows-to-columns implementation is specific to combining data from [`gh migration-audit`](https://github.com/timrogers/gh-migration-audit) with other reports like [`gh repo-stats`](https://github.com/mona-actions/gh-repo-stats). The combine columns is generic

## Setup and Installation

This repository uses npm workspaces to manage dependencies. To install all dependencies:

```bash
# From the root directory
npm install
```

To build both actions:

```bash
# From the root directory
npm run build
```

## Actions

### Combine Columns

This action combines two CSV files by adding columns from the additional CSV into the base CSV when rows match based on specified columns.

#### Inputs

- `base_csv_file`: Path to the base CSV file.
- `additional_csv_file`: Path to the additional CSV file.
- `output_file`: Path to the output CSV file.
- `base_csv_columns`: Comma-separated list of columns in the base CSV to check for equality.
- `additional_csv_columns`: Comma-separated list of columns in the additional CSV to check for equality.

[More details](./combine-columns/README.md)

### Rows to Columns

This action converts rows from an additional CSV into new columns in a base CSV. It parses number from the values and add an additional column called `has_unmigratable` if any data was found

#### Inputs

- `base_csv_file`: Path to the base CSV file.
- `additional_csv_file`: Path to the additional CSV file.
- `output_file`: Path to the output CSV file.
- `header_column_keys`: Column in the additional CSV to use as headers in the combined CSV.
- `header_column_valuess`: Column in the additional CSV to use as values in the combined CSV.
- `base_csv_columns`: Comma-separated list of columns in the base CSV to check for equality.
- `additional_csv_columns`: Comma-separated list of columns in the additional CSV to check for equality.

[More details](./rows-to-columns/README.md)

## Local Development

Each action can be tested locally using the provided environment files:

```bash
# For combine-columns action
cd combine-columns
source local.env
node index.js

# For rows-to-columns action
cd rows-to-columns
source local.env
node index.js
```

## Sample Files

Example CSV files are provided in the `examples` directories for each action to help you understand the input and output formats.

## License

ISC
