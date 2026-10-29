# Process Statistics for Claude Code

Your measurements, control limits and investigations in a database you own. Built for the weekly process review. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Follow the quick start. | Your measurements, rules and Minitab worksheet data brought across. [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=minitab). | Installed and operated through Omni by Enterprise DNA. One setup fee, then a monthly retainer. [Talk to Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=minitab). |

Minitab lists Solution Center Core at US$2,394 per named user annually, before taxes. [Vendor pricing](https://www.minitab.com/en-us/try-buy/), checked 29 October 2026. This is a published licence price, not a customer invoice or an equivalent-service savings claim.

This free base calculates descriptive statistics, individuals and moving-range signals, and overall Pp/Ppk. It keeps source rows, saved results, specification revisions and investigation notes. It does not implement every Minitab procedure. No batch release, legal certification or regulated validation is claimed. [Methods and assumptions](docs/methods.md).

## Quick start

Node 20 or later.

```bash
git clone https://github.com/Enterprise-DNA-OS/process-statistics-for-claude-code.git
cd process-statistics-for-claude-code
npm install
npm test
npm run demo
npm run view
npm run docs
```

Demo data is fictional: a fill excursion, a missing observation, a sparse torque study, overdue reviews and an overdue investigation. Seed only a demo database. PGlite persists under .data/db; DATA_DIR selects another location. DATABASE_URL selects Postgres. For actual records, start with an empty database and npm run migrate, then import your worksheet. Never commit connection strings or private data.

## The weekly review

Ask /weekly-review to combine the process overview, overdue work and record checks. Read /batches to compare shifts, /control-chart to find exceptional observations, and /capability for overall performance with explicit assumptions. Use /add-action and /log to record the actual investigation. Drafts never send.

```bash
npm run stats -- analyse --series="Fill baseline" --method=individuals --actor="Demo operator" --evidence="Fictional baseline for the demonstration"
npm run stats -- control-chart --series="Fill week" --baseline=<returned-analysis-id>
npm run stats -- capability --series="Fill week"
```

Replace the placeholder with the saved analysis identifier. Fixed limits let later observations be tested against that baseline. With no baseline, limits are estimated from the current series and labelled accordingly. Missing observations break moving-range adjacency. A number is never an approval.

## Commands

29 CLI operations and 31 agent command recipes. Human output by default and --json for machines. Case-insensitive names and partial identifiers resolve records; ambiguous choices list candidates and exit 1. [Full CLI](docs/cli.md). Every runtime shares .claude/commands.

## Ten questions your own records answer

These combine process data, specification history, owners and review rules. They are executable questions, not an unsupported claim that Minitab cannot answer them.

| Question | Read command |
|---|---|
| Which processes have overdue investigations and an overdue process review? | weekly-review |
| Which imported series have missing measurements? | compliance |
| Which later observations break the limits from our saved baseline? | control-chart --series="Fill week" --baseline=<saved-id> |
| Which shift contains the largest observed fill value? | batches --series="Fill week" |
| How many valid observations support this capability number? | capability --series="Fill week" |
| Which saved results still refer to the previous specification revision? | analyses, then draft-analysis --analysis=<saved-id> |
| Which imports came from the same source and mapping fingerprints? | imports |
| Who recorded a specification change and why? | specifications |
| Which source records are due for a retention review? | compliance |
| Which investigations are closed with recorded evidence? | actions |

## Your first hour: ten things to ask for

1. Show the processes and their units.
2. Find overdue investigations.
3. Count missing observations in the latest series.
4. Compare the two demo shifts.
5. Save an individuals baseline from the fictional measurements.
6. Check the later series against those fixed limits.
7. Explain the assumptions behind overall Pp/Ppk.
8. Trial my worksheet export with an explicit mapping.
9. Add a machine identifier using /customise.
10. Add a weekly operator report using /new-view.

## Switching and ownership

[Bring your Minitab CSV worksheet across](docs/replace-minitab.md) in one command after mapping its columns. A dry run validates all rows without writing. Repeated identical imports return the existing series. Source rows, checksums and mapping are retained. Binary projects, graphs, macros and advanced models need separate work and verification before switching.

Eight domain tables and five reporting views support one CLI. Export writes a private archive of all domain records and refuses to overwrite files. Use database-native backups for recovery. Shared deployment requires authenticated access, backups and operational controls. [Record controls](docs/compliance.md).

## Documents and views

Set business name, logo and colours in brand.json. npm run docs produces saved analysis and investigation records. npm run view renders review and control summaries from the database views. /draft-analysis and /draft-review write HTML to drafts/. Screens are read-only and nothing sends. [Why no front end](docs/why-no-front-end.md).

## Validation

npm test exercises all 29 operations with disposable data, independent numeric expectations, malformed and repeat imports, fixed baseline signals, historical specifications, export protection and escaped report content. An optional TEST_DATABASE_URL selects a disposable empty Postgres database. CI declares Windows and Linux runs on Node 20 and 22. See docs/verification.md for the checks actually run.

MIT. Copyright 2026 Enterprise DNA. Independent project, not affiliated with Minitab.
