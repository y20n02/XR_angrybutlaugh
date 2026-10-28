# Answer evaluation server

Setup and Verse8 deployment details: [../docs/answer-evaluation.md](../docs/answer-evaluation.md).

This directory must run in a trusted server process, never in the browser bundle. Supply `AI_URL`, `AI_MODEL`, `AI_KEY` using the host's server-only secret environment. Do not use a `VITE_` prefix for secrets. No credentials are included.
