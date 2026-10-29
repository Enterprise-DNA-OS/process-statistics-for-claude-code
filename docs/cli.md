# CLI reference

Every operation accepts --json. Flags use --name=value. Exact names match without case sensitivity; partial identifiers are supported. Ambiguous records list candidates and exit 1. Empty, invalid and unknown inputs exit 1. Successful commands exit 0. All source and output files stay local.

- `processes`: Read the process register.
- `series`: Read measurement series and missing counts.
- `specifications`: Review specification history.
- `analyses`: Read saved analyses and their input fingerprints.
- `actions`: Read investigation ownership and deadlines.
- `notes`: Read recorded observations.
- `activity`: Read local changes and declared actors.
- `attention`: Find overdue investigations and review dates.
- `compliance`: Check measurement and record controls.
- `week`: Read the process review overview.
- `imports`: Reconcile source and mapping fingerprints.
- `help`: List supported CLI operations.
- `show --series="<supplied series>"`: Read one measurement series with its notes and actions.
- `measurements --series="<supplied series>"`: Read ordered observations.
- `describe --series="<supplied series>"`: Summarise count, missing data and sample variation.
- `control-chart --series="<supplied series>"`: Calculate individuals and moving-range signals.
- `capability --series="<supplied series>"`: Calculate exploratory overall Pp and Ppk.
- `batches --series="<supplied series>"`: Compare descriptive results by batch or shift.
- `weekly-review`: Review this week from three record checks.
- `add-process --name="<name>" --unit="<unit>" --owner="<owner>" --purpose="<purpose>" --review-due=<YYYY-MM-DD> --actor="<operator>"`: Register a process from supplied facts.
- `set-spec --process="<process>" --lower=<number> --upper=<number> --reason="<supplied approval evidence>" --actor="<operator>"`: Record a new specification revision.
- `import minitab --file=<worksheet.csv> --map=<mapping.json> --process="<process>" --name="<series>" --review-due=<YYYY-MM-DD> --actor="<operator>"`: Bring a Minitab worksheet across.
- `analyse --series="<series>" --method=<describe|individuals|capability> --actor="<operator>" --evidence="<supplied interpretation>"`: Save a reproducible analysis and interpretation.
- `add-action --series="<series>" --text="<investigation>" --owner="<owner>" --due=<YYYY-MM-DD> --actor="<operator>"`: Assign an investigation from supplied facts.
- `close-action --action="<action>" --evidence="<actual resolution>" --actor="<operator>"`: Record a completed investigation.
- `log --series="<series>" --text="<note>" --actor="<operator>"`: Record a factual process note.
- `export --out=exports/<new-file>.json`: Write a portable private record archive.
- `draft-analysis --analysis=<analysis-id>`: Draft a saved analysis document.
- `draft-review`: Draft the weekly process review.

Use --baseline=<saved-individuals-analysis-id> with control-chart or analyse to reuse fixed limits for the same process. No baseline means limits are estimated from the current series. Explicit references preserve the original saved baseline and current input fingerprint. Calculation reads do not save analyses; analyse does.

Import accepts only Minitab CSV worksheets with an explicit mapping. See replace-minitab.md. Imported series are immutable through the CLI. Corrections arrive as a new series so previous analyses retain their inputs. Export is a complete JSON archive and refuses an existing destination.
