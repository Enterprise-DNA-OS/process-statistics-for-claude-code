---
description: Assign an investigation from supplied facts
---
# Assign an investigation from supplied facts

Read CLAUDE.md. Resolve the supplied record from the register first. If there are multiple matches, show the candidates and obtain the exact choice. Do not guess missing facts.

Run `npm run stats -- add-action --series="<series>" --text="<investigation>" --owner="<owner>" --due=<YYYY-MM-DD> --actor="<operator>" --json`.

Present the result in plain language with its source series and date. Mutations require supplied facts and the actual operator name. Names are declarations, not authenticated signatures. Drafts stay in drafts/ and never send.
