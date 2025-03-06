# CSV Combiner

Combines data from two CSV files based on user-defined columns and modes. Preserves the base CSV data as the first rows of the output CSV and adds additional rows from the additional CSV. Creates a `Has_Unmigratable` row in the output CSV which is set to `true` if the additional CSV produces any data for that row. All rows after `Has_Unmigratable` are data from the additional CSV and are set to the number if reported, `1+` if a count is not reported but data was found, and `0` otherwise.

## Inputs

- `base_csv_file`: Path to the base CSV file.
- `additional_csv_file`: Path to the additional CSV file.
- `output_file`: Path to the output CSV file.
- `header_column`: Column in the additional CSV to use as headers in the combined CSV.
- `base_csv_columns`: Comma-separated list of columns in the base CSV to check for equality.
- `additional_csv_columns`: Comma-separated list of columns in the additional CSV to check for equality.
- `mode`: Mode of operation (default or direct). Default is `default`.

## Modes

### Default Mode
In the default mode, the base CSV data is preserved as the first rows of the output CSV. Additional rows from the additional CSV are added based on the specified columns for equality. A `Has_Unmigratable` column is created to indicate if the additional CSV produces any data for that row. All rows after `Has_Unmigratable` are data from the additional CSV and are set to the number if reported, `1+` if a count is not reported but data was found, and `0` otherwise. This works specifically to combine the output of `repo stats` with the output of `migration audit`

### Direct Mode
In the direct mode, the headers from both the base CSV and additional CSV are combined directly, excluding the columns used for matching. The combined data is then written to the output CSV.

## Sample Workflow

Sample workflow: [.github/workflows/repos-report.yaml](./.github/workflows/repos-report.yaml)
