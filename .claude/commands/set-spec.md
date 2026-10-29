---
description: Record a new specification revision
---
# Record a new specification revision

Read CLAUDE.md. Resolve the supplied record from the register first. If there are multiple matches, show the candidates and obtain the exact choice. Do not guess missing facts.

Run `npm run stats -- set-spec --process="<process>" --lower=<number> --upper=<number> --reason="<supplied approval evidence>" --actor="<operator>" --json`.

Present the result in plain language with its source series and date. Mutations require supplied facts and the actual operator name. Names are declarations, not authenticated signatures. Drafts stay in drafts/ and never send.
