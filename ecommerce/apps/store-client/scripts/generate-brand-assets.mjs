import fs from 'node:fs/promises';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.resolve(__dirname, '../public');

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let current = index;

    for (let step = 0; step < 8; step += 1) {
      current = (current & 1) ? (0xedb88320 ^ (current >>> 1)) : (current >>> 1);
    }

    table[index] = current >>> 0;
  }

  return table;
})();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createChunk = (type, data) => {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  let crc = 0xffffffff;

  for (const byte of Buffer.concat([typeBuffer, data])) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  crcBuffer.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
};

const rgba = (red, green, blue, alpha = 255) => [red, green, blue, alpha];

const mixColor = (from, to, amount) => {
  const t = clamp(amount, 0, 1);
  return [
    Math.round(from[0] + ((to[0] - from[0]) * t)),
    Math.round(from[1] + ((to[1] - from[1]) * t)),
    Math.round(from[2] + ((to[2] - from[2]) * t)),
    Math.round(from[3] + ((to[3] - from[3]) * t))
  ];
};

const setPixel = (buffer, width, x, y, color) => {
  if (x < 0 || y < 0 || x >= width) {
    return;
  }

  const index = ((y * width) + x) * 4;
  buffer[index] = color[0];
  buffer[index + 1] = color[1];
  buffer[index + 2] = color[2];
  buffer[index + 3] = color[3];
};

const drawRect = (buffer, width, height, x, y, rectWidth, rectHeight, color) => {
  const minX = Math.max(0, Math.floor(x));
  const maxX = Math.min(width, Math.ceil(x + rectWidth));
  const minY = Math.max(0, Math.floor(y));
  const maxY = Math.min(height, Math.ceil(y + rectHeight));

  for (let currentY = minY; currentY < maxY; currentY += 1) {
    for (let currentX = minX; currentX < maxX; currentX += 1) {
      setPixel(buffer, width, currentX, currentY, color);
    }
  }
};

const distanceToSegment = (pointX, pointY, startX, startY, endX, endY) => {
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = (dx * dx) + (dy * dy);

  if (lengthSquared === 0) {
    return Math.hypot(pointX - startX, pointY - startY);
  }

  const t = clamp((((pointX - startX) * dx) + ((pointY - startY) * dy)) / lengthSquared, 0, 1);
  const projectionX = startX + (t * dx);
  const projectionY = startY + (t * dy);

  return Math.hypot(pointX - projectionX, pointY - projectionY);
};

const drawLine = (buffer, width, height, startX, startY, endX, endY, thickness, color) => {
  const minX = Math.max(0, Math.floor(Math.min(startX, endX) - thickness));
  const maxX = Math.min(width, Math.ceil(Math.max(startX, endX) + thickness));
  const minY = Math.max(0, Math.floor(Math.min(startY, endY) - thickness));
  const maxY = Math.min(height, Math.ceil(Math.max(startY, endY) + thickness));
  const radius = thickness / 2;

  for (let currentY = minY; currentY < maxY; currentY += 1) {
    for (let currentX = minX; currentX < maxX; currentX += 1) {
      if (distanceToSegment(currentX + 0.5, currentY + 0.5, startX, startY, endX, endY) <= radius) {
        setPixel(buffer, width, currentX, currentY, color);
      }
    }
  }
};

const fillBackground = (buffer, width, height, wide = false) => {
  const top = rgba(10, 31, 68);
  const bottom = rgba(7, 17, 31);
  const glow = rgba(243, 212, 121, 255);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const verticalMix = y / Math.max(height - 1, 1);
      let color = mixColor(top, bottom, verticalMix);
      const highlightX = wide ? width * 0.28 : width * 0.32;
      const highlightY = wide ? height * 0.26 : height * 0.22;
      const distance = Math.hypot(x - highlightX, y - highlightY) / Math.max(width, height);
      const glowStrength = clamp(0.22 - distance, 0, 0.22) / 0.22;
      color = mixColor(color, glow, glowStrength * (wide ? 0.12 : 0.18));
      setPixel(buffer, width, x, y, color);
    }
  }
};

const drawMonogram = (buffer, width, height, x, y, size) => {
  const gold = rgba(243, 212, 121);
  const deepGold = rgba(212, 175, 55);
  const stroke = mixColor(gold, deepGold, 0.34);
  const unit = size / 10;

  drawRect(buffer, width, height, x + (0.6 * unit), y + (1.2 * unit), 1.05 * unit, 6.2 * unit, stroke);
  drawRect(buffer, width, height, x + (3.55 * unit), y + (1.2 * unit), 1.05 * unit, 6.2 * unit, stroke);
  drawLine(buffer, width, height, x + (1.45 * unit), y + (1.25 * unit), x + (4.05 * unit), y + (7.35 * unit), unit * 1.02, stroke);

  drawRect(buffer, width, height, x + (5.45 * unit), y + (1.2 * unit), 2.9 * unit, 1.05 * unit, stroke);
  drawRect(buffer, width, height, x + (7.2 * unit), y + (1.2 * unit), 1.05 * unit, 5.55 * unit, stroke);
  drawRect(buffer, width, height, x + (5.95 * unit), y + (6.5 * unit), 2.3 * unit, 1.05 * unit, stroke);
  drawRect(buffer, width, height, x + (5.35 * unit), y + (5.95 * unit), 1.05 * unit, 1.8 * unit, stroke);
};

const drawOgDecor = (buffer, width, height) => {
  const gold = rgba(212, 175, 55, 255);
  const muted = rgba(243, 212, 121, 255);

  drawRect(buffer, width, height, width * 0.08, height * 0.16, width * 0.005, height * 0.68, gold);
  drawRect(buffer, width, height, width * 0.1, height * 0.22, width * 0.16, height * 0.015, muted);
  drawRect(buffer, width, height, width * 0.1, height * 0.76, width * 0.26, height * 0.015, gold);
  drawRect(buffer, width, height, width * 0.66, height * 0.22, width * 0.2, height * 0.012, muted);
  drawRect(buffer, width, height, width * 0.66, height * 0.76, width * 0.14, height * 0.012, gold);
};

const createPng = (width, height, draw) => {
  const pixelData = Buffer.alloc(width * height * 4);
  draw(pixelData, width, height);

  const scanlines = Buffer.alloc(height * ((width * 4) + 1));

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * ((width * 4) + 1);
    scanlines[rowStart] = 0;
    pixelData.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    createChunk('IHDR', header),
    createChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    createChunk('IEND', Buffer.alloc(0))
  ]);
};

const writePng = async (filename, width, height, draw) => {
  const png = createPng(width, height, draw);
  await fs.writeFile(path.join(publicDirectory, filename), png);
};

await fs.mkdir(publicDirectory, { recursive: true });

await writePng('pwa-192.png', 192, 192, (buffer, width, height) => {
  fillBackground(buffer, width, height);
  drawMonogram(buffer, width, height, width * 0.14, height * 0.12, width * 0.72);
});

await writePng('pwa-512.png', 512, 512, (buffer, width, height) => {
  fillBackground(buffer, width, height);
  drawMonogram(buffer, width, height, width * 0.14, height * 0.12, width * 0.72);
});

await writePng('apple-touch-icon.png', 180, 180, (buffer, width, height) => {
  fillBackground(buffer, width, height);
  drawMonogram(buffer, width, height, width * 0.14, height * 0.12, width * 0.72);
});

await writePng('og-default.png', 1200, 630, (buffer, width, height) => {
  fillBackground(buffer, width, height, true);
  drawOgDecor(buffer, width, height);
  drawMonogram(buffer, width, height, width * 0.34, height * 0.18, height * 0.64);
});

console.log('[assets] Generated PNG app and social assets.');
