# Bring your Minitab worksheet across

Minitab documents File > Save Worksheet As and CSV worksheet export in its [export guide](https://support.minitab.com/en-us/minitab/help-and-how-to/data-input-and-output/save-and-export-data-and-output/save-and-export-minitab-projects-and-worksheets/), checked 29 October 2026. Export the worksheet, not the project. CSV is a documented export format; our fixture is synthetic and is not a captured customer export.

1. In Minitab, save the relevant worksheet as CSV with column names. Preserve numeric values, not formatted labels. Convert ANSI exports to UTF-8 using the known original encoding. Do not guess the encoding.
2. Choose one measurement variable, a timestamp column and an optional batch or shift column. If timestamps lack a timezone, convert them using the actual measurement timezone before import. The importer never invents a collection time. Multiple variables require separate imports with their own mappings and process units.
3. Register the process with its actual unit, owner, purpose and review date. Record approved lower and upper specifications separately. Exported worksheet values do not contain a validated specification decision.
4. Write the mapping with the exact exported column names. The fixture uses Measured, Fill and Batch; your headers can be different. Missing markers are explicit, with blank and * as the default. Other nonnumeric text fails.

```bash
npm run stats -- add-process --name="Fill line" --unit=ml --owner="Your supplied owner" --purpose="Weekly process study" --review-due=2026-12-01 --actor="Your name"
npm run stats -- import minitab --file=imports/worksheet.csv --map=imports/map.json --process="Fill line" --name="October observations" --review-due=2026-12-01 --actor="Your name" --dry-run
npm run stats -- import minitab --file=imports/worksheet.csv --map=imports/map.json --process="Fill line" --name="October observations" --review-due=2026-12-01 --actor="Your name"
```

The last line is the one-command import. The dry run validates all rows and writes nothing. Files are capped at 20 MB. Every row is validated before a transaction writes it; an invalid numeric value, invalid date, duplicate timestamp, malformed CSV or missing mapped column stops the batch. Original columns remain in raw records. Extra columns are preserved but not automatically analysed. The source filename, source digest, mapping digest, actor and row counts accompany the import. Repeating identical bytes and mapping for the same process returns the existing series. Changed files become a new series and must not be mistaken for incremental updates.

Compare row counts, missing counts, means, units and date ranges with the original worksheet. Then compare the same statistics with matching assumptions and bias-correction settings. Keep the existing system until your required procedures and reports are validated.

Project files, saved graphs, macros, session commands, variable metadata, transformations, weights and advanced statistical models do not arrive through CSV. This base does not read MTW, MWX, MPX or MPJ files, instrument feeds or binary project formats. Enterprise DNA scopes additional calculations, collection feeds and business reports for a custom version. Never claim every Minitab workflow is replaced by this starter.

Use export --out=exports/backup.json to retain all eight domain record types, original rows, specifications, results and notes. Exports refuse to overwrite an existing file. A database-native backup is required for full operational recovery; the JSON is a portable record archive, not an automated restore system.
