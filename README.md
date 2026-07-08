# Apollo Recovery Command Center

Browser-based demo interface for a local recovery controller on Apollo.

## What this prototype shows

- 6TB source drive imaged to 8TB with `ddrescue`
- Safety gates before repurposing the original source drive
- Apollo NVMe used for ledger/mapfile mirroring and fast control state
- PhotoRec/TestDisk recovery from the image, not the original disk
- Validation and dedupe queues for good unique files vs corrupted best copies

## Demo mode

This repository is safe to publish. It contains only mock data and interface logic.

Run locally:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Real-mode direction

The production version should add:

- FastAPI backend running on Apollo
- SQLite recovery ledger
- `ddrescue` worker with mapfile monitoring
- PhotoRec/TestDisk wrapper with stall detection
- File validators for images/video/audio/PDF/archive/documents
- Explicit confirmation gates for destructive actions

## Never commit

The real app must keep these out of git:

- `*.img`
- `*.map`
- `*.sqlite`
- recovered files
- drive serial metadata
- logs/reports containing filenames
