# thermopb API

RTM — Route To Meeting. A local, durable implementation of the seeded Tracekit demo.

From the repository root:

```sh
python3 -m venv api/.venv
api/.venv/bin/pip install -r api/requirements.txt
DEMO_MODE=1 api/.venv/bin/python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

Interactive API documentation: <http://127.0.0.1:8000/docs>.

Run the behavioral checks:

```sh
python3 -m unittest discover -s api/tests -v
```

The API loads `fixtures/seed.json` into `api/data/thermopb.sqlite3` on first use. Set
`THERMOPB_DB_PATH` to choose a separate local database. SQLite serializes writes,
including credit spending, and persists captures, drafts, stage changes and audit
events across restarts. Repeated discovery for the same intake and repeated draft
approval do not duplicate spend or approval records.

The plan's endpoints are implemented, with these additional UI helpers:

| Endpoint | Purpose |
| --- | --- |
| `GET /health`, `GET /integrations` | Explicit demo mode and disconnected provider status |
| `GET /leads`, `/network`, `/radar`, `/agents` | Initial screen data |
| `GET /evidence/{id}` | Read the fictional source record behind a citation |
| `GET /drafts` | Local draft and approval queue |
| `POST /drafts/{id}/review` | Recheck `edited_body` without approving |
| `POST /drafts/{id}/reject` | Reject an unapproved draft |
| `PATCH /pipeline/{target_id}` | Record a user-confirmed stage change |
| `GET /radar/{event_id}/calendar` | Download a calendar entry labeled `[DEMO]` |
| `POST /credits/topup` | Add local demo credits; no money is charged |
| `POST /demo/reset`, `POST /demo/restore` | Reset for replay, then restore the previous local demo state |
| `GET /audit` | Read the action log |

All external services remain disconnected. The intake response is the illustrative
fixture ICP, not a live model extraction. Discovery is fixture loading, not web
search. Email verification labels are seeded, not Hunter results. The event alert
endpoint returns `sent: false` and a button preview. Cake coverage is unconfirmed
and no checkout link is invented. Setting `DEMO_MODE=0` blocks fixture-backed
intake, discovery, scanning and top-up; it does not enable live providers.

Graph mutations pass through `graph_writer.py`. Only known relationship types can
participate in paths; merely sharing a company node creates no relationship.
Inferred edges receive a 0.6 multiplier. Recency uses a one-year half-life, with a
0.5 floor. Paths are cycle-free, ranked by multiplied trust × recency × target fit,
and limited to four hops. These scores are not calibrated reply probabilities.

Contact capture creates only the direct relationship confirmed by the user.
Existing public identities match by exact profile URL. Capturing an arbitrary
person does not manufacture downstream connections. Capturing the seeded Priya
profile improves three target paths because her fictional relationships already
exist in the cited seed graph.

Draft review conservatively accepts only exact seeded evidence sentences and the
generated request language. Any unsupported edit blocks approval. The sameness
value uses local token overlap, not Moss embeddings. Approved drafts are queued
locally; approval never sends a message, deducts sent-message credits or claims a
target was contacted. Users can record actual manual outreach through the pipeline
stage control. Every delivery provider requires a separate, tested integration.
