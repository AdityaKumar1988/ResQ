import fs from "fs";
import zlib from "zlib";

// ==========================================
// 1. MASTER SVG FAVICON
// ==========================================
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1329" />
      <stop offset="100%" stop-color="#050914" />
    </linearGradient>
    <linearGradient id="pinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00f0ff" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="crossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#00f0ff" />
    </linearGradient>
  </defs>

  <!-- Base App Icon Container -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#00f0ff" stroke-opacity="0.25" stroke-width="6" />

  <!-- GPS Location Pin Frame -->
  <path
    d="M 256,464 C 205,385 112,285 112,192 A 144,144 0 1,1 400,192 C 400,285 307,385 256,464 Z"
    fill="#0c1836"
    stroke="url(#pinGrad)"
    stroke-width="26"
    stroke-linejoin="round"
  />

  <!-- Inner Medical Cross -->
  <g fill="url(#crossGrad)">
    <!-- Vertical cross bar -->
    <rect x="230" y="100" width="52" height="184" rx="14" />
    <!-- Horizontal cross bar -->
    <rect x="164" y="166" width="184" height="52" rx="14" />
  </g>

  <!-- ECG Heartbeat / Emergency Response Pulse Line -->
  <path
    d="M 136,192 L 204,192 L 226,228 L 256,112 L 286,268 L 308,192 L 376,192"
    fill="none"
    stroke="#ffffff"
    stroke-width="22"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Center Pulse Beacon Dot -->
  <circle cx="256" cy="112" r="7" fill="#00f0ff" />
</svg>
`;

fs.writeFileSync("public/favicon.svg", svgContent, "utf8");
console.log("✓ Created public/favicon.svg");

// ==========================================
// 2. PROCEDURAL HIGH-QUALITY RASTERIZER
// ==========================================
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.sqrt(dx * dx + dy * dy);
}

function sdRoundedRect(px, py, x, y, w, h, r) {
  const qx = Math.abs(px - (x + w / 2)) - (w / 2 - r);
  const qy = Math.abs(py - (y + h / 2)) - (h / 2 - r);
  const extX = Math.max(qx, 0);
  const extY = Math.max(qy, 0);
  const inside = Math.min(Math.max(qx, qy), 0);
  return Math.sqrt(extX * extX + extY * extY) + inside - r;
}

function sdCircle(px, py, cx, cy, r) {
  const dx = px - cx, dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy) - r;
}

// Distance to GPS Pin
function sdPin(px, py) {
  // Pin top circle center (256, 192), radius 144
  // Pin tip at (256, 464)
  const tipX = 256, tipY = 464;
  const cX = 256, cY = 192, R = 144;
  
  if (py <= cY) {
    return sdCircle(px, py, cX, cY, R);
  }
  // Tangent points from tip to circle
  const dY = tipY - cY;
  const sinA = R / dY;
  const cosA = Math.sqrt(1 - sinA * sinA);
  const tanLX = cX - R * cosA, tanLY = cY + R * sinA;
  const tanRX = cX + R * cosA, tanRY = cY + R * sinA;

  const d1 = sdSegment(px, py, tanLX, tanLY, tipX, tipY);
  const d2 = sdSegment(px, py, tanRX, tanRY, tipX, tipY);
  const dCircle = sdCircle(px, py, cX, cY, R);

  const dSide = Math.min(d1, d2);
  // Check if inside polygon
  const isInside = py < tipY && px >= (tipX + (tanLX - tipX) * ((tipY - py) / (tipY - tanLY))) &&
                             px <= (tipX + (tanRX - tipX) * ((tipY - py) / (tipY - tanRY)));
  return isInside ? -Math.min(dSide, -dCircle) : Math.min(dSide, dCircle);
}

// Render sample color at 512x512 normalized coordinate
function sampleColor(x, y) {
  // 1. Container bounds
  const dContainer = sdRoundedRect(x, y, 0, 0, 512, 512, 112);
  if (dContainer > 0) return [0, 0, 0, 0]; // Transparent

  // Background color gradient
  const tBg = (x + y) / 1024;
  let r = Math.round(11 * (1 - tBg) + 5 * tBg);
  let g = Math.round(19 * (1 - tBg) + 9 * tBg);
  let b = Math.round(41 * (1 - tBg) + 20 * tBg);
  let a = 255;

  // Inner border
  const dBorder = Math.abs(sdRoundedRect(x, y, 8, 8, 496, 496, 104));
  if (dBorder <= 3) {
    const alpha = Math.max(0, 1 - dBorder / 3) * 0.25;
    r = Math.round(r * (1 - alpha) + 0 * alpha);
    g = Math.round(g * (1 - alpha) + 240 * alpha);
    b = Math.round(b * (1 - alpha) + 255 * alpha);
  }

  // 2. Pin Outline & Fill
  const dPin = sdPin(x, y);
  const pinStrokeWidth = 13; // half stroke
  if (dPin <= 0) {
    // Inside Pin Body
    r = 12; g = 24; b = 54;
  }
  if (Math.abs(dPin) <= pinStrokeWidth) {
    // Pin Stroke Gradient
    const tPin = Math.max(0, Math.min(1, y / 512));
    const pr = Math.round(0 * (1 - tPin) + 2 * tPin);
    const pg = Math.round(240 * (1 - tPin) + 132 * tPin);
    const pb = Math.round(255 * (1 - tPin) + 199 * tPin);
    const edgeFade = Math.min(1, (pinStrokeWidth - Math.abs(dPin)) + 0.5);
    r = Math.round(r * (1 - edgeFade) + pr * edgeFade);
    g = Math.round(g * (1 - edgeFade) + pg * edgeFade);
    b = Math.round(b * (1 - edgeFade) + pb * edgeFade);
  }

  // 3. Medical Cross
  const dVert = sdRoundedRect(x, y, 230, 100, 52, 184, 14);
  const dHoriz = sdRoundedRect(x, y, 164, 166, 184, 52, 14);
  const dCross = Math.min(dVert, dHoriz);
  if (dCross <= 0) {
    const tC = (x + y) / 1024;
    const cr = Math.round(56 * (1 - tC) + 0 * tC);
    const cg = Math.round(189 * (1 - tC) + 240 * tC);
    const cb = Math.round(248 * (1 - tC) + 255 * tC);
    const crossFade = Math.min(1, -dCross + 0.5);
    r = Math.round(r * (1 - crossFade) + cr * crossFade);
    g = Math.round(g * (1 - crossFade) + cg * crossFade);
    b = Math.round(b * (1 - crossFade) + cb * crossFade);
  }

  // 4. ECG Pulse Line
  const ecgPts = [
    [136, 192], [204, 192], [226, 228], [256, 112], [286, 268], [308, 192], [376, 192]
  ];
  let dPulse = 999;
  for (let i = 0; i < ecgPts.length - 1; i++) {
    const d = sdSegment(x, y, ecgPts[i][0], ecgPts[i][1], ecgPts[i+1][0], ecgPts[i+1][1]);
    if (d < dPulse) dPulse = d;
  }
  const pulseRadius = 11;
  if (dPulse <= pulseRadius) {
    const pulseFade = Math.min(1, (pulseRadius - dPulse) + 0.5);
    r = Math.round(r * (1 - pulseFade) + 255 * pulseFade);
    g = Math.round(g * (1 - pulseFade) + 255 * pulseFade);
    b = Math.round(b * (1 - pulseFade) + 255 * pulseFade);
  }

  // 5. Beacon Dot at peak (256, 112)
  const dDot = sdCircle(x, y, 256, 112, 7);
  if (dDot <= 0) {
    r = 0; g = 240; b = 255;
  }

  // Anti-alias container outer border
  if (dContainer > -1.5 && dContainer <= 0) {
    a = Math.round(255 * (-dContainer / 1.5));
  }

  return [r, g, b, a];
}

// Supersampled renderer
function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const ss = 4; // 4x4 supersampling for ultra-smooth anti-aliasing
  const scale = 512 / size;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const sampleX = (px + (sx + 0.5) / ss) * scale;
          const sampleY = (py + (sy + 0.5) / ss) * scale;
          const [sr, sg, sb, sa] = sampleColor(sampleX, sampleY);
          sumR += (sr * sa) / 255;
          sumG += (sg * sa) / 255;
          sumB += (sb * sa) / 255;
          sumA += sa;
        }
      }
      const totalSamples = ss * ss;
      const finalA = Math.round(sumA / totalSamples);
      const finalR = finalA > 0 ? Math.min(255, Math.round((sumR / totalSamples) * (255 / finalA))) : 0;
      const finalG = finalA > 0 ? Math.min(255, Math.round((sumG / totalSamples) * (255 / finalA))) : 0;
      const finalB = finalA > 0 ? Math.min(255, Math.round((sumB / totalSamples) * (255 / finalA))) : 0;

      const idx = (py * size + px) * 4;
      buf[idx] = finalR;
      buf[idx + 1] = finalG;
      buf[idx + 2] = finalB;
      buf[idx + 3] = finalA;
    }
  }
  return buf;
}

// CRC32 table
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgbaBuffer) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // Color type 6 (RGBA)
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Non-interlaced

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter 0 (None)
    rgbaBuffer.copy(row, 1, y * width * 4, (y + 1) * width * 4);
    rawRows.push(row);
  }
  const compressed = zlib.deflateSync(Buffer.concat(rawRows));
  return Buffer.concat([
    header,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Generate all standard icon sizes
const sizes = [
  { size: 16, path: "public/favicon-16x16.png" },
  { size: 32, path: "public/favicon-32x32.png" },
  { size: 48, path: "public/favicon-48x48.png" },
  { size: 180, path: "public/apple-touch-icon.png" },
  { size: 192, path: "public/icon-192.png" },
  { size: 512, path: "public/icon-512.png" },
];

const pngBuffers = {};
for (const s of sizes) {
  console.log(`Generating ${s.size}x${s.size} PNG...`);
  const raw = renderIcon(s.size);
  const png = encodePNG(s.size, s.size, raw);
  fs.writeFileSync(s.path, png);
  pngBuffers[s.size] = png;
  console.log(`✓ Wrote ${s.path} (${png.length} bytes)`);
}

// ==========================================
// 3. MULTI-SIZE FAVICON.ICO (16, 32, 48)
// ==========================================
function encodeICO(icoSizes, buffers) {
  const count = icoSizes.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO type
  header.writeUInt16LE(count, 4); // Number of images

  let offset = 6 + count * 16;
  const dirEntries = [];
  const imageBuffers = [];

  for (const sz of icoSizes) {
    const png = buffers[sz];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(sz >= 256 ? 0 : sz, 0); // Width
    entry.writeUInt8(sz >= 256 ? 0 : sz, 1); // Height
    entry.writeUInt8(0, 2); // Colors in palette (0 = >=8bpp)
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(png.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset of image data
    dirEntries.push(entry);
    imageBuffers.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

const ico = encodeICO([16, 32, 48], pngBuffers);
fs.writeFileSync("public/favicon.ico", ico);
console.log(`✓ Wrote public/favicon.ico (${ico.length} bytes, multi-resolution 16x16, 32x32, 48x48)`);

// ==========================================
// 4. WEB MANIFEST
// ==========================================
const manifest = {
  name: "Smart EMS — Emergency Operations Platform",
  short_name: "Smart EMS",
  description: "Enterprise emergency medical dispatch and incident response platform.",
  start_url: "/",
  display: "standalone",
  background_color: "#080e1a",
  theme_color: "#0f1420",
  icons: [
    {
      src: "/favicon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    },
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  ],
};

fs.writeFileSync("public/site.webmanifest", JSON.stringify(manifest, null, 2), "utf8");
console.log("✓ Wrote public/site.webmanifest");
console.log("\nAll Smart EMS brand favicon assets generated successfully!");
