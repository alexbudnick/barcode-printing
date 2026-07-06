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
    version: "1.0.3",
    endpoints: [
      "GET /health",
      "GET /label?sku=...&name=...&location=...",
      "GET /barcode?sku=..."
    ],
    labelSize: "DYMO 30252 Address - 3.5in x 1.125in",
    note: "v1.0.3 makes the label text larger while keeping the DYMO safe print margin."
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "airtable-dymo-label-printer",
    version: "1.0.3"
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
      height: 11,
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

  if (!sku) {
    return res.status(400).send("Missing SKU");
  }

  const safeSku = escapeHtml(sku);
  const safeName = escapeHtml(name || sku);
  const safeLocation = escapeHtml(location);
  const safePrice = escapeHtml(price);

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
      width: 3.24in;
      height: 1.005in;
      margin: 0.06in 0.20in 0.06in 0.06in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      background: white;
    }

    .name {
      width: 100%;
      font-size: 11.2pt;
      font-weight: 700;
      line-height: 1.05;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .barcode-wrap {
      width: 100%;
      height: 0.43in;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .barcode {
      width: 2.82in;
      max-width: 100%;
      max-height: 0.40in;
      object-fit: contain;
      display: block;
    }

    .meta {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.06in;
      font-size: 10.1pt;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
    }

    .sku {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .right-meta {
      flex: 0 1 auto;
      max-width: 1.05in;
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
      <div class="name">${safeName}</div>

      <div class="barcode-wrap">
        <img
          class="barcode"
          src="/barcode?sku=${encodeURIComponent(sku)}"
          alt="${safeSku} barcode"
        >
      </div>

      <div class="meta">
        <div class="sku">SKU: ${safeSku}</div>
        <div class="right-meta">${rightMeta}</div>
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
