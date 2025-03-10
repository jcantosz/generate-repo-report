# Rows to Columns CSV Converter

This GitHub Action converts rows from an additional CSV into new columns in a base CSV. It was originally designed to combine data from repository statistics and migration audit data.

It parses digits from the data that it finds and makes that the new column value. Intended to parse data from [`gh migration-audit`](https://github.com/timrogers/gh-migration-audit)

## Inputs

- `base_csv_file`: Path to the base CSV file.
- `additional_csv_file`: Path to the additional CSV file.
- `output_file`: Path to the output CSV file.
- `header_column_keys`: Column in the additional CSV to use as headers in the combined CSV.
- `header_column_valuess`: Column in the additional CSV to use as values in the combined CSV.
- `base_csv_columns`: Comma-separated list of columns in the base CSV. Values checked against the additional columns.
- `additional_csv_columns`: Comma-separated list of columns in the additional CSV. Values checked against the base columns.

## Operation

1. For each row in the base CSV, it finds matching rows in the additional CSV based on the specified columns
    1. When matches are found, it adds new columns to the base CSV row with names taken from the `header_column_keys`
    1. Values are taken from the column denoted by `header_column_values`. This is parsed for digits the new value will be:
        - # - parsed digits if found
        - 1+ - row existed but no digits were found
        - 0 - row did not exist for the matched data
1. Adds a "Has_Unmigratable" column to indicate if any matching rows were found


## Example

```yaml
- name: Convert CSV rows to columns
  uses: ./rows-to-columns
  with:
    base_csv_file: 'repo-stats.csv'
    additional_csv_file: 'migration-audit.csv'
    output_file: 'output.csv'
    header_column_keys: 'type'
    header_column_values: 'message'
    base_csv_columns: 'Org_Name,Repo_Name'
    additional_csv_columns: 'owner,name'
```

## Local Testing

```bash
source local.env && node index.js
```