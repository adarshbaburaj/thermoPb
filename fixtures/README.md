# Demo fixtures

All target people, organizations, relationships, signals, and events are fictional. The founder and Tracekit supply the demo context only. Demo evidence is never a claim of live discovery or verification.

`seed.json` is the single combined API/UI seed. The individual JSON files are generated views. Run `python3 scripts/seed_fixtures.py` to reproduce all fixtures and entity pages. Dates intentionally anchor the November 24, 2026 demo; update the generator before a later live presentation.

`Connections.csv` demonstrates the public LinkedIn-export column shape using fictional contacts and reserved `.example` URLs. No private contact details are included.

Every graph edge has provenance, an evidence ID, a source path, an observation timestamp, and an EXTRACTED or INFERRED label. EXTRACTED means stated in the fictional fixture; it does not mean independently verified. Priya has three documented demo relationships before capture. Capturing her adds only the founder’s direct edge; arbitrary captures receive no invented relationships.
