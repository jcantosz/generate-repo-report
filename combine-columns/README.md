# Combine CSV Columns

This GitHub Action combines two CSV files by adding columns from an additional CSV file into a base CSV file when rows match based on specified columns.

Note: If a column used to match only exists in the additional csv file it will not exist in the output, but if it only exists in the base csv, it will be present

## Inputs

- `base_csv_file`: Path to the base CSV file.
- `additional_csv_file`: Path to the additional CSV file.
- `output_file`: Path to the output CSV file.
- `base_csv_columns`: Comma-separated list of columns in the base CSV to check for equality.
- `additional_csv_columns`: Comma-separated list of columns in the additional CSV to check for equality.

## Operation

1. For matches on columns, adds all columns from the additional CSV (except for the matching columns) to the base CSV row 


## Example

```yaml
- name: Combine CSV files
  uses: jcantosz/generate-repo-report/columns-columns@main
  with:
    base_csv_file: 'base-data.csv'
    additional_csv_file: 'additional-data.csv'
    output_file: 'combined-output.csv'
    base_csv_columns: 'Org_Name,Repo_Name'
    additional_csv_columns: 'owner,name'
```

## Local Testing

You can test this action locally by running:

```bash
source local.env && node index.js
```