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
  "version": "1.0.6"
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
  ENCODE_URL_COMPONENT({Location} & "") &
  "&serial=" &
  ENCODE_URL_COMPONENT({Serial Number} & ""),
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
  ENCODE_URL_COMPONENT({Location} & "") &
  "&serial=" &
  ENCODE_URL_COMPONENT({Serial Number} & "") &
  "&price=" &
  ENCODE_URL_COMPONENT({Price} & ""),
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

The page automatically opens the print dialog after loading. This v1.0.6 adds serial number support and increases the top/bottom safe margin to prevent DYMO clipping.

## Endpoints

```text
GET /
GET /health
GET /label?sku=...&name=...&location=...&serial=...
GET /barcode?sku=...
```

The barcode is Code 128 and encodes the SKU exactly.


## v1.0.6 changes

- Adds `serial` support on label URLs.
- Accepts `serial`, `serialNumber`, or `sn` as the serial query parameter.
- Increases top and bottom safe margins to reduce DYMO clipping.
- Slightly reduces barcode height to make room for serial number while keeping the text large.


## v1.0.6 notes

- Makes the serial number line easier to see by reserving a fixed footer area.
- Accepts `serial`, `serialNumber`, `serial_number`, `sn`, `SN`, and `Serial Number` query parameters.
- Adds larger top/bottom print safety margins.

Example URL:

```
/label?sku=A07062601&name=Test%20Guitar&location=A1A&serial=SN12345
```


## v1.0.6 layout update

Optimized for DYMO 30252 with location in the top-right corner, a larger centered barcode, SKU on the bottom-left, and serial number on the bottom-right. This keeps top/bottom safe margins while making the important text and barcode larger.
