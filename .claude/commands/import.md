---
description: Bring a Minitab worksheet across
---
# Bring a Minitab worksheet across

Read CLAUDE.md. Resolve the supplied record from the register first. If there are multiple matches, show the candidates and obtain the exact choice. Do not guess missing facts.

Run `npm run stats -- import minitab --file=<worksheet.csv> --map=<mapping.json> --process="<process>" --name="<series>" --review-due=<YYYY-MM-DD> --actor="<operator>" --json`.

Read docs/replace-minitab.md first. Validate the exact mapping with --dry-run, compare counts, then run the same command without it. Never invent timestamps, units, source data or missing-value codes.

Present the result in plain language with its source series and date. Mutations require supplied facts and the actual operator name. Names are declarations, not authenticated signatures. Drafts stay in drafts/ and never send.
