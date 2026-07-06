# Airtable DYMO Label Printer

Small Railway app that makes print-ready DYMO 30252 barcode labels from Airtable button URLs.

Label size:

```text
DYMO 30252 Address
3.5in x 1.125in
```

## Railway deploy

1. Create a new Railway project.
2. Upload/deploy this repo.
3. Set Start Command to:

```text
npm start
```

4. Generate a public Railway domain.
5. Check:

```text
https://YOUR-LABEL-APP.up.railway.app/health
```

Expected:

```json
{
  "ok": true,
  "service": "airtable-dymo-label-printer",
  "version": "1.0.3"
}
```

## Airtable formula

Create a formula field in `Inventory` named:

```text
Label Print URL
```

Use this formula, replacing the Railway URL:

```airtable
IF(
  {SKU},
  "https://YOUR-LABEL-APP.up.railway.app/label?sku=" &
  ENCODE_URL_COMPONENT({SKU}) &
  "&name=" &
  ENCODE_URL_COMPONENT({Name}) &
  "&location=" &
  ENCODE_URL_COMPONENT({Location}),
  ""
)
```

Optional version with price:

```airtable
IF(
  {SKU},
  "https://YOUR-LABEL-APP.up.railway.app/label?sku=" &
  ENCODE_URL_COMPONENT({SKU}) &
  "&name=" &
  ENCODE_URL_COMPONENT({Name}) &
  "&location=" &
  ENCODE_URL_COMPONENT({Location}) &
  "&price=" &
  ENCODE_URL_COMPONENT({Price}),
  ""
)
```

## Airtable button

Create a button field:

```text
Print Barcode Label
```

Settings:

```text
Action: Open URL
URL formula: {Label Print URL}
```

## Browser / DYMO print settings

Use:

```text
Printer: DYMO LabelWriter
Label size: 30252 Address
Scale: 100%
Margins: None / minimum
Orientation: Landscape
Headers and footers: Off
```

The page automatically opens the print dialog after loading. This v1.0.3 version uses larger label text while preserving the right-side safe margin.

## Endpoints

```text
GET /
GET /health
GET /label?sku=...&name=...&location=...
GET /barcode?sku=...
```

The barcode is Code 128 and encodes the SKU exactly.
