import express from "express";
import bwipjs from "bwip-js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

function clean(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clampText(value, maxLength) {
  const text = clean(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "airtable-dymo-label-printer",
    version: "1.0.6",
    endpoints: [
      "GET /health",
      "GET /label?sku=...&name=...&location=...&serial=...",
      "GET /barcode?sku=..."
    ],
    labelSize: "DYMO 30252 Address - 3.5in x 1.125in",
    note: "v1.0.6 uses an optimized compact layout: location top-right, larger barcode, larger text, and serial bottom-right."
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "airtable-dymo-label-printer",
    version: "1.0.6"
  });
});

app.get("/barcode", async (req, res) => {
  const sku = clean(req.query.sku);

  if (!sku) {
    return res.status(400).send("Missing SKU");
  }

  try {
    const png = await bwipjs.toBuffer({
      bcid: "code128",
      text: sku,
      scale: 3,
      height: 14,
      includetext: false,
      paddingwidth: 0,
      paddingheight: 0
    });

    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.send(png);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/label", (req, res) => {
  const sku = clean(req.query.sku);
  const name = clampText(req.query.name, 72);
  const location = clean(req.query.location);
  const price = clean(req.query.price);
  const serial = clampText(
    req.query.serial ||
    req.query.serialNumber ||
    req.query.serial_number ||
    req.query.sn ||
    req.query.SN ||
    req.query["Serial Number"] ||
    req.query["serial number"],
    44
  );

  if (!sku) {
    return res.status(400).send("Missing SKU");
  }

  const safeSku = escapeHtml(sku);
  const safeName = escapeHtml(name || sku);
  const safeLocation = escapeHtml(location);
  const safePrice = escapeHtml(price);
  const safeSerial = escapeHtml(serial);

  const rightMeta = safeLocation
    ? `LOC: ${safeLocation}`
    : safePrice
      ? safePrice
      : "";

  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeSku} Label</title>
  <style>
    @page {
      size: 3.5in 1.125in;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 3.5in;
      height: 1.125in;
      margin: 0;
      padding: 0;
      background: white;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
    }

    body {
      overflow: hidden;
    }

    .label {
      width: 3.5in;
      height: 1.125in;
      padding: 0;
      overflow: hidden;
      background: white;
    }

    /*
      DYMO/Chrome often clips the far right edge even when @page is exact.
      Keep all real content inside a smaller safe area instead of using the full 3.5in.
    */
    .safe-area {
      width: 3.22in;
      height: 0.935in;
      margin: 0.095in 0.22in 0.095in 0.06in;
      display: grid;
      grid-template-rows: 0.18in 0.50in 0.205in;
      row-gap: 0.025in;
      overflow: hidden;
      background: white;
    }

    .top-row {
      width: 100%;
      height: 0.18in;
      display: flex;
      align-items: center;
      gap: 0.055in;
      overflow: hidden;
      white-space: nowrap;
    }

    .name {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 10.6pt;
      font-weight: 800;
      line-height: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .location {
      flex: 0 0 auto;
      max-width: 0.78in;
      font-size: 10.2pt;
      font-weight: 900;
      line-height: 1;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .barcode-wrap {
      width: 100%;
      height: 0.50in;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .barcode {
      width: 3.04in;
      max-width: 100%;
      max-height: 0.49in;
      object-fit: contain;
      display: block;
    }

    .bottom-row {
      width: 100%;
      height: 0.205in;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.08in;
      font-weight: 900;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
    }

    .sku {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 10.4pt;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .serial {
      flex: 0 1 auto;
      max-width: 1.28in;
      font-size: 9.0pt;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media print {
      html,
      body {
        width: 3.5in;
        height: 1.125in;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden;
      }
    }

    @media screen {
      html,
      body {
        width: auto;
        height: auto;
        min-height: 100%;
      }

      body {
        padding: 20px;
        background: #eee;
      }

      .label {
        width: 3.5in;
        height: 1.125in;
        background: #fff;
        border: 1px solid #999;
      }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="safe-area">
      <div class="top-row">
        <div class="name">${safeName}</div>
        ${safeLocation ? `<div class="location">${safeLocation}</div>` : ""}
      </div>

      <div class="barcode-wrap">
        <img
          class="barcode"
          src="/barcode?sku=${encodeURIComponent(sku)}"
          alt="${safeSku} barcode"
        >
      </div>

      <div class="bottom-row">
        <div class="sku">${safeSku}</div>
        ${safeSerial ? `<div class="serial">SN: ${safeSerial}</div>` : ""}
      </div>
    </div>
  </div>

  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 300);
    });
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`DYMO label printer app listening on port ${PORT}`);
});
