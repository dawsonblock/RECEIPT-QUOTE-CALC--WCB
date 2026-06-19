# WCB Receipt Packet Builder

Local-first Mac-hosted receipt packet builder for WCB submissions. The Mac app/backend stores all data locally and generates a clean PDF packet. The iPhone is treated as a Safari web companion served from the Mac over the local Wi-Fi network.

## Architecture

- **Mac/server**
  - Fastify API server
  - Local JSON packet storage
  - Receipt file storage
  - HEIC/HEIF to JPEG conversion through macOS `sips`
  - PDF packet generation through `pdf-lib`
- **iPhone/companion**
  - React/Vite web UI
  - Served from the Mac in dev via Vite
  - Later: packaged into the Mac shell and served locally by the Mac app
- **Shared package**
  - `packages/shared` contains the domain types used by both server and web

## Repository layout

```text
apps/server/       Fastify backend and PDF generator
apps/web/          React/Vite web UI
packages/shared/   Shared TypeScript domain types
```

## Local storage layout

By default, all packet data is stored under:

```text
~/Documents/WCB Receipt Packets/
  packet-<id>/
    packet.json
    receipts/
    thumbnails/
    exports/
```

You can override the storage root for development/testing:

```bash
WCB_DATA_ROOT=/tmp/wcb-test pnpm --filter @wcb/server dev
```

Receipts and PDFs are never uploaded to a cloud service by this implementation.

## Install

```bash
pnpm install
```

## Development

Start the server and web UI together:

```bash
pnpm dev
```

Or start them separately:

```bash
pnpm dev:server
pnpm dev:web
```

The web UI runs at:

```text
http://localhost:5173
```

The API runs at:

```text
http://127.0.0.1:8787
```

## Typecheck and build

```bash
pnpm typecheck
pnpm build
```

Per-package checks:

```bash
pnpm --filter @wcb/server typecheck
pnpm --filter @wcb/web typecheck
pnpm --filter @wcb/server build
pnpm --filter @wcb/web build
```

## Clean local build outputs

```bash
pnpm clean
```

## API overview

### Packet

```bash
curl -X POST http://127.0.0.1:8787/api/packet/new \
  -H 'Content-Type: application/json' \
  -d '{"claimantName":"Dawson Block","claimNumber":"WCB123"}'

curl http://127.0.0.1:8787/api/packet
```

### Receipts

Upload a receipt:

```bash
curl -X POST http://127.0.0.1:8787/api/receipts \
  -F 'file=@/path/to/receipt.pdf;filename=receipt.pdf' \
  -F 'packetId=<packet-id>'
```

Update receipt metadata:

```bash
curl -X PUT http://127.0.0.1:8787/api/receipts/<receipt-id> \
  -H 'Content-Type: application/json' \
  -d '{
    "vendor":"Example Pharmacy",
    "purchaseDate":"2026-06-19",
    "amount":"25.00",
    "category":"medication",
    "reason":"Prescription medication for WCB injury treatment.",
    "notes":""
  }'
```

Generate the PDF packet:

```bash
curl -X POST http://127.0.0.1:8787/api/export/pdf
```

Download/open the latest export:

```bash
curl http://127.0.0.1:8787/api/export/latest
```

## PDF export behavior

The generated PDF currently includes:

1. Cover page
2. Summary page
3. Each included receipt page
4. A reason page after each PDF receipt
5. Inline reason text for image receipts

Export is blocked when:

- Claim number is missing
- No receipts are included
- Any included receipt has a reason shorter than 10 characters

Missing vendor/date/amount are warnings, not hard export blockers.

## Supported receipt file types

- JPEG/JPG
- PNG
- HEIC/HEIF
- PDF

HEIC/HEIF files are converted to JPEG at upload time using macOS `/usr/bin/sips`, because `pdf-lib` cannot embed HEIC directly.

## iPhone access

Current behavior:

- Server binds to `127.0.0.1` by default.
- The web UI shows an iPhone Access panel.
- Enabling iPhone access generates an access code and reports a local URL.
- Actual runtime rebind from `127.0.0.1` to `0.0.0.0` is planned for the Mac shell/Tauri phase.

For local development testing, you can start the server bound to LAN with:

```bash
WCB_IPHONE_ACCESS=1 pnpm --filter @wcb/server dev
```

Security notes:

- Do not enable iPhone access on public networks.
- Do not forward port `8787` through a router or firewall.
- Keep iPhone access disabled unless your iPhone is on the same trusted Wi-Fi network.

## Current MVP scope

Completed:

- Local JSON packet storage
- Receipt upload and metadata editing
- PDF packet generation
- React web UI
- Shared TypeScript types
- HEIC/HEIF conversion using macOS tools
- Server and web production builds
- Smoke-tested receipt-to-PDF flow

Still planned:

- Tauri Mac shell
- Proper Mac shell management of LAN binding and iPhone access
- Open export folder action
- Duplicate receipt detection in the upload route
- Automated tests for validation and PDF generation
- Packaging instructions for a distributable Mac app

## Useful environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `WCB_DATA_ROOT` | `~/Documents/WCB Receipt Packets` | Local storage root |
| `WCB_PORT` | `8787` | API port |
| `WCB_IPHONE_ACCESS` | unset | Set to `1` to bind LAN host in dev |
| `WCB_WEB_ORIGIN` | `http://localhost:5173` | CORS origin for dev web UI |
