# CSV Post-Processing

This module allows you to process CSV data using configurable rules. It's designed to transform and standardize CSV data based on patterns, handle empty values, and add indicator columns.

## Usage

The post-processor can be used either as a GitHub Action or directly via Node.js:

```js
// Direct usage
const { postProcessCsv } = require("./post-process");
```

```yaml
# GitHub Action usage
- uses: your-repo/post-process@main
  with:
    input_csv: "input.csv"
    output_csv: "output.csv"
    rules_file: "post-process.rules.json"
```

## Rules Configuration

The rules are defined in a JSON file with the following structure.

### Case Sensitivity

- Pattern matching is case-insensitive
- Column names in rules ignore case
- Column name matching between CSV files (for merging data) is case-insensitive by default

### Rules Structure

```json
{
  "rules": [
    {
      "columns": ["*"],
      "pattern": "regex pattern",
      "fallback": "value when pattern doesn't match",
      "emptyValue": "value for empty cells",
      "replacement": "replacement pattern"
    },
    {
      "columns": ["column1", "column2", "column3"],
      "pattern": "pattern for these columns",
      "fallback": "fallback for these columns",
      "emptyValue": "empty value for these columns",
      "replacement": "replacement for these columns"
    }
  ],
  "processColumns": {
    "columns": ["specific", "columns", "to", "process"],
    "columnRanges": [{ "start": 0, "end": 3 }, 5, { "start": 7 }]
  },
  "indicatorColumns": [
    {
      "name": "indicator column name",
      "sourceColumns": ["columns", "to", "check"],
      "sourceColumnRanges": [{ "start": 0, "end": 3 }],
      "trueValue": true,
      "falseValue": false
    }
  ]
}
```

### Rule Components

1. **Rules Array** (`rules`)

   - Array of rule objects that define how to process columns
   - Each rule specifies:
     - `columns`: Array of column names this rule applies to (**required**)
     - `pattern`: Regex pattern to match in cell values (optional)
     - `fallback`: Value to use when pattern doesn't match (optional, default: "1+")
     - `emptyValue`: Value for empty cells (optional, default: "0")
     - `replacement`: Pattern for replacing matches (optional, default: "$0")
   - Later rules take precedence over earlier ones
   - Use `"*"` in a columns array to apply to all columns not matched by other rules

2. **Process Columns** (`processColumns`)

   - Specifies which columns to process
   - If omitted, all columns are processed
   - Properties:
     - `columns`: Array of column names to process
     - `columnRanges`: Array of ranges or indices
       - Each range can be a number or {start, end} object
       - End is exclusive in ranges

3. **Indicator Columns** (`indicatorColumns`)
   - Define new columns based on the state of other columns
   - Array of indicator configurations
   - Properties for each indicator:
     - `name`: Name of the new column
     - `sourceColumns`: Specific columns to check
     - `sourceColumnRanges`: Ranges of columns to check
     - `trueValue`: Value when conditions are met
     - `falseValue`: Value when conditions are not met

## Required vs Optional Properties

### Top Level Properties

- **All top-level properties are optional except for rules**
  - `rules`: Required - Array of rules that define how to process columns
  - `processColumns`: Optional - Specify which columns to process
  - `indicatorColumns`: Optional - Define additional indicator columns

### Rule Properties (in the `rules` array)

- Each rule object must have:
  - `columns`: Required - Array of column names this rule applies to
    - Can include a wildcard `"*"` to match all columns not specifically matched
- All other properties are optional:
  - `pattern`: Optional - Regex pattern to match
  - `fallback`: Optional - Defaults to "1+"
  - `emptyValue`: Optional - Defaults to "0"
  - `replacement`: Optional - Defaults to "$0"

### Process Columns Properties (`processColumns`)

- Both sub-properties are optional:
  - `columns`: Optional - Array of column names
  - `columnRanges`: Optional - Array of ranges/indices

### Indicator Column Properties (`indicatorColumns`)

Each indicator object requires:

- Required properties:
  - `name`: Required - Name of the new indicator column
  - `trueValue`: Required - Value when conditions are met
  - `falseValue`: Required - Value when conditions are not met
- Optional properties:
  - `sourceColumns`: Optional - Specific columns to check
  - `sourceColumnRanges`: Optional - Ranges of columns to check
  - Note: If neither is provided, all columns will be checked

### Column Range Properties

When using column ranges, if specifying an object:

- `start`: Optional - Start index (defaults to 0 if not specified)
- `end`: Optional - End index (defaults to end of columns if not specified)
- Alternatively, can be specified as a single number

## Rules Precedence

When multiple rules apply to the same column, the **last matching rule** in the `rules` array takes precedence. This allows for a general wildcard rule at the start of the array with more specific rules later.

### Examples

1. **Basic Rule with Wildcard**

```json
{
  "rules": [
    {
      "columns": ["*"],
      "pattern": "(\\d+)",
      "fallback": "1+",
      "emptyValue": "0",
      "replacement": "$1"
    }
  ]
}
```

2. **Multiple Column Rules**

```json
{
  "rules": [
    {
      "columns": ["git-lfs-objects", "git-submodules", "repository-pages-customdomain"],
      "fallback": true,
      "emptyValue": false
    },
    {
      "columns": ["repository-releases", "repository-disk-usage"],
      "pattern": "(\\d+[.]?\\d*\\s+[KkMmGgTt][Bb])",
      "fallback": ">1 GB",
      "emptyValue": "No problem",
      "replacement": "$1"
    }
  ]
}
```

3. **Rule Overrides**

```json
{
  "rules": [
    {
      "columns": ["*"],
      "pattern": "(\\d+)",
      "fallback": "1+",
      "emptyValue": "0"
    },
    {
      "columns": ["repository-releases"],
      "pattern": "(\\d+[.]?\\d*\\s+[GgTt][Bb])",
      "fallback": ">5 GB",
      "replacement": ">$1"
    }
  ]
}
```

4. **Boolean Indicators**

```json
{
  "indicatorColumns": [
    {
      "name": "Has_Unmigratable",
      "sourceColumnRanges": [{ "start": 2, "end": 5 }],
      "trueValue": true,
      "falseValue": false
    }
  ]
}
```

## Column Range Specification

Column ranges can be specified in several ways:

1. Single number: `5` (process all columns from index 5 to the end, equivalent to `{"start": 5}`)
2. Start-only: `{"start": 3}` (process from index 3 to end)
3. Full range: `{"start": 2, "end": 5}` (process columns 2 through 4)

Note:

- Ranges are zero-based and the end index is exclusive
- When using a single number n, it's treated as `{"start": n}` and will process all columns from that index to the end
- If both start and end are omitted in an object, all columns will be processed

## Value Processing

Values are processed in the following order:

1. Check if value is empty/null → use `emptyValue`
2. Try to match `pattern` → if matches, apply `replacement`
3. If no match → use `fallback`

The `replacement` string can use regex capture groups:

- `$0`: Full match
- `$1`, `$2`, etc.: Capture group matches

## Local Development

To test the post-processor locally:

1. Copy `local.env.tmpl` to `local.env`
2. Set your environment variables
3. Run:

```bash
source local.env && node index.js
```
