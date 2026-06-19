# Development Notes

## Quick validation

From the repository root:

```bash
pnpm typecheck
pnpm build
```

Or per package:

```bash
pnpm --filter @wcb/server typecheck
pnpm --filter @wcb/web typecheck
pnpm --filter @wcb/server build
pnpm --filter @wcb/web build
```

## Smoke test the receipt-to-PDF flow

Use a temporary data root so the smoke test does not touch real user documents:

```bash
rm -rf /tmp/wcb-smoke
WCB_DATA_ROOT=/tmp/wcb-smoke pnpm --filter @wcb/server dev
```

In another terminal:

```bash
curl -sS http://127.0.0.1:8787/api/status
```

Create a packet:

```bash
curl -sS -X POST http://127.0.0.1:8787/api/packet/new \
  -H 'Content-Type: application/json' \
  -d '{"claimantName":"Dawson Block","claimNumber":"WCB123"}'
```

Create a minimal sample PDF receipt:

```bash
python3 - <<'PY'
from pathlib import Path
out = Path('/tmp/wcb-smoke/sample-receipt.pdf')
out.write_bytes(b'''%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 18 Tf
100 700 Td
(Sample Receipt) Tj
/F1 12 Tf
0 -30 Td
(Vendor: Test Vendor) Tj
0 -20 Td
(Amount: $25.00) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000250 00000 n 
0000000419 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
496
%%EOF
''')
print(out)
PY
```

Upload and update the receipt. Replace `<packet-id>` and `<receipt-id>` with values returned by the previous API calls:

```bash
curl -sS -X POST http://127.0.0.1:8787/api/receipts \
  -F 'file=@/tmp/wcb-smoke/sample-receipt.pdf;filename=sample-receipt.pdf' \
  -F 'packetId=<packet-id>'

curl -sS -X PUT http://127.0.0.1:8787/api/receipts/<receipt-id> \
  -H 'Content-Type: application/json' \
  -d '{
    "vendor":"Test Vendor",
    "purchaseDate":"2026-06-19",
    "amount":"25.00",
    "category":"medical",
    "reason":"Test receipt for smoke validation.",
    "notes":""
  }'
```

Generate the PDF:

```bash
curl -sS -X POST http://127.0.0.1:8787/api/export/pdf
```

Verify the file:

```bash
file /tmp/wcb-smoke/packet-<packet-id>/exports/WCB_Receipt_Packet_WCB123_2026-06-19.pdf
ls -lh /tmp/wcb-smoke/packet-<packet-id>/exports/WCB_Receipt_Packet_WCB123_2026-06-19.pdf
```

## Frontend build resolution note

The web package imports `@wcb/shared` from the workspace package. `apps/web/tsconfig.json` includes the shared source package and sets `rootDir` to the workspace root so TypeScript can typecheck package-style imports. `pnpm install` creates the workspace link needed by Vite/Rollup for production builds.

## Local data safety

The `.gitignore` excludes local app data and build outputs. Receipt files, generated PDFs, and environment files should not be committed.
