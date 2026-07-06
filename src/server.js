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
    version: "1.0.0",
    endpoints: [
      "GET /health",
      "GET /label?sku=...&name=...&location=...",
      "GET /barcode?sku=..."
    ],
    labelSize: "DYMO 30252 Address - 3.5in x 1.125in"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "airtable-dymo-label-printer",
    version: "1.0.0"
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
      height: 12,
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

    .label {
      width: 3.5in;
      height: 1.125in;
      padding: 0.07in 0.1in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      background: white;
    }

    .name {
      font-size: 9pt;
      font-weight: 700;
      line-height: 1.05;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .barcode-wrap {
      width: 100%;
      height: 0.48in;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .barcode {
      width: 3.05in;
      max-height: 0.46in;
      object-fit: contain;
      display: block;
    }

    .meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.08in;
      font-size: 8.5pt;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }

    .sku {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .right-meta {
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
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
