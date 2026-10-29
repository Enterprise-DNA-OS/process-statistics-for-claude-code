# Process Statistics for Claude Code: operating instructions

This is an owned process statistics desk for a process engineer or quality lead. Establish the business, operator, unit, approved specification and sampling plan before entering actual records. All demo processes, observations and people are fictional.

Use the one CLI, npm run stats, with --json for machine reads. Read before writing. Never invent measurements, collection times, specifications, actors, approvals or investigation results. Names match case-insensitively and partial identifiers work; ambiguous references must stop for the operator to choose.

## One path per job

| Job | Command |
|---|---|
| Read the process register | /processes |
| Read measurement series and missing counts | /series |
| Review specification history | /specifications |
| Read saved analyses and their input fingerprints | /analyses |
| Read investigation ownership and deadlines | /actions |
| Read recorded observations | /notes |
| Read local changes and declared actors | /activity |
| Find overdue investigations and review dates | /attention |
| Check measurement and record controls | /compliance |
| Read the process review overview | /week |
| Reconcile source and mapping fingerprints | /imports |
| List supported CLI operations | /help |
| Read one measurement series with its notes and actions | /show |
| Read ordered observations | /measurements |
| Summarise count, missing data and sample variation | /describe |
| Calculate individuals and moving-range signals | /control-chart |
| Calculate exploratory overall Pp and Ppk | /capability |
| Compare descriptive results by batch or shift | /batches |
| Review this week from three record checks | /weekly-review |
| Register a process from supplied facts | /add-process |
| Record a new specification revision | /set-spec |
| Bring a Minitab worksheet across | /import |
| Save a reproducible analysis and interpretation | /analyse |
| Assign an investigation from supplied facts | /add-action |
| Record a completed investigation | /close-action |
| Record a factual process note | /log |
| Write a portable private record archive | /export |
| Draft a saved analysis document | /draft-analysis |
| Draft the weekly process review | /draft-review |
| Add a field or change a method | /customise |
| Add a read-only report | /new-view |

## Boundaries

Never send, change an instrument setting, certify a product, approve a batch or upload source data. Statistical outputs are conditional on sampling, stability and distribution assumptions. Read docs/methods.md before interpreting. The compliance command is a record checklist, not a legal or statistical certification. Actor names are declared text, not authentication. The database owner can edit the audit trail.

## Files and checks

scripts/stats.mjs is the one CLI. supabase/migrations contains versioned database changes. docs/replace-minitab.md owns the import procedure. docs/methods.md owns method definitions and limitations. docs/compliance.md cites record obligations. brand.json, views.json and documents.json render local reports. Every runtime uses .claude/commands; do not create a second library.

Run npm test after changes. Tests always use disposable data and clear DATABASE_URL unless TEST_DATABASE_URL explicitly selects a disposable Postgres instance. Do not seed a real database. Keep source files, reports, archives and credentials out of git. Shared use requires access controls and operational validation.
