# Sector Creation Flow — V4

TODO

## Change verification and artifact handoff

Every V4 change to generation code, generation data, constraints, or tests must run the relevant automated test before handoff. The eventual V4 generator test must produce and validate a deterministic artifact at `/tmp/randomroll-swn-sector-v4.json`, and the handoff for each change must provide that artifact to the user. Changes to TypeScript production code must also pass `npx tsc --noEmit`.
