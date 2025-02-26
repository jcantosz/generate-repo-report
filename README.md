# Generate Repo Report

Combines data from [gh-repo-stats](https://github.com/mona-actions/gh-repo-stats) and [gh-migration-audit](https://github.com/timrogers/gh-migration-audit) (`audit-all` or `audit-repos` output _not_ `audit-repo`) into a single CSV.

Preserves `repo-stats` data as tje frist rows of the CSV and adds additional rows to it with data from the `migration-audit`. Creates `Has_Unmigratable` row in CSV which is set to `true` if migration-audit produces any data for that repo. All rows after `Has_Unmigratable` are data from migration audit and are set to the number if reported `1+` if a count is not reported but data was found for the repo and `0` otherwise.

Sample workflow: [.github/workflows/repos-report.yaml](./.github/workflows/repos-report.yaml)
