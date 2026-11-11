import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// CRC32 table for PNG chunk generation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcData = buf.subarray(4, 8 + len);
  const crc = crc32(crcData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// Generate RGBA image bitmap for Souq Al-Wali emblem
function generateIconRGBA(size, isMaskable = false) {
  const buffer = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * (isMaskable ? 0.48 : 0.45);
  const innerRadius = radius * 0.88;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background color: Deep navy (#0d3b66)
      let r = 13, g = 59, b = 102, a = 255;

      if (isMaskable) {
        // Full square background with subtle gradient
        const grad = (y / size);
        r = Math.round(13 + grad * 5);
        g = Math.round(59 + grad * 15);
        b = Math.round(102 + grad * 20);
      } else {
        // Rounded squircle / circular border
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy));
        if (cornerDist > size * 0.48) {
          a = 0;
        }
      }

      // Outer gold circle ring (#d4af37)
      if (dist <= radius && dist >= innerRadius) {
        r = 212; g = 175; b = 55; a = 255;
      }

      // Inside emblem area (#07223b / #0d3b66)
      if (dist < innerRadius) {
        r = 7; g = 34; b = 59; a = 255;
        
        // Gold shopping bag/cart center motif
        const boxTop = cy - size * 0.16;
        const boxBottom = cy + size * 0.22;
        const boxLeft = cx - size * 0.22;
        const boxRight = cx + size * 0.22;

        if (y >= boxTop && y <= boxBottom && x >= boxLeft && x <= boxRight) {
          // Inside bag
          const bagBorder = (x <= boxLeft + size * 0.03 || x >= boxRight - size * 0.03 || y >= boxBottom - size * 0.03 || y <= boxTop + size * 0.03);
          if (bagBorder) {
            r = 212; g = 175; b = 55; a = 255; // Gold border
          } else {
            // Bag center fill (#d4af37 with soft brightness)
            r = 244; g = 208; b = 104; a = 255;
            // Center check / cart icon in navy
            const subDx = Math.abs(x - cx);
            const subDy = Math.abs(y - (cy + size * 0.03));
            if (subDx < size * 0.08 && subDy < size * 0.08) {
              r = 13; g = 59; b = 102; a = 255;
            }
          }
        }

        // Bag handles (arc at top)
        const handleCy = boxTop;
        const handleDx = x - cx;
        const handleDy = y - handleCy;
        const handleDist = Math.sqrt(handleDx * handleDx + handleDy * handleDy);
        if (y < boxTop && handleDist <= size * 0.16 && handleDist >= size * 0.12) {
          r = 212; g = 175; b = 55; a = 255; // Gold handle
        }
      }

      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }
  return buffer;
}

function createPng(width, height, rgbaBuffer) {
  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Compression method
  ihdrData.writeUInt8(0, 11); // Filter method
  ihdrData.writeUInt8(0, 12); // Interlace method
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0 (None)
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const scanlineIdx = y * (1 + width * 4);
    scanlines[scanlineIdx] = 0; // Filter 0
    const srcIdx = y * width * 4;
    rgbaBuffer.copy(scanlines, scanlineIdx + 1, srcIdx, srcIdx + width * 4);
  }

  // Deflate compressed IDAT
  const compressed = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate all required icons
console.log('Generating PWA icons for Souq Al-Wali...');

const sizes = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'favicon-32.png', size: 32, maskable: false },
  { name: 'favicon-16.png', size: 16, maskable: false }
];

for (const item of sizes) {
  const rgba = generateIconRGBA(item.size, item.maskable);
  const png = createPng(item.size, item.size, rgba);
  const filePath = path.join(ICONS_DIR, item.name);
  fs.writeFileSync(filePath, png);
  console.log(`✓ Created ${item.name} (${item.size}x${item.size}px)`);
}

// Also copy icon-192.png and icon-512.png directly to public root for maximum compatibility
fs.copyFileSync(path.join(ICONS_DIR, 'icon-192.png'), path.join(PUBLIC_DIR, 'icon-192.png'));
fs.copyFileSync(path.join(ICONS_DIR, 'icon-512.png'), path.join(PUBLIC_DIR, 'icon-512.png'));
fs.copyFileSync(path.join(ICONS_DIR, 'apple-touch-icon.png'), path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

// Also create a crisp SVG Icon
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d3b66" />
      <stop offset="100%" stop-color="#07223b" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f5d77f" />
      <stop offset="50%" stop-color="#d4af37" />
      <stop offset="100%" stop-color="#aa8620" />
    </linearGradient>
    <linearGradient id="goldLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f5d77f" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Background Squircle -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
  
  <!-- Outer Gold Ring -->
  <circle cx="256" cy="256" r="216" fill="none" stroke="url(#goldGrad)" stroke-width="12" filter="url(#shadow)" />
  <circle cx="256" cy="256" r="198" fill="none" stroke="#22c55e" stroke-width="4" stroke-dasharray="8 6" opacity="0.8" />

  <!-- Inner Badge Container -->
  <circle cx="256" cy="256" r="180" fill="#071e33" />

  <!-- Shopping Cart / Bag Graphic -->
  <g filter="url(#shadow)">
    <!-- Bag Handle -->
    <path d="M 206 170 C 206 126, 306 126, 306 170" fill="none" stroke="url(#goldGrad)" stroke-width="16" stroke-linecap="round" />
    
    <!-- Bag Body -->
    <path d="M 166 170 L 346 170 L 326 340 C 324 356, 312 368, 296 368 L 216 368 C 200 368, 188 356, 186 340 Z" fill="url(#goldGrad)" />
    
    <!-- Bag Inner Pocket / Cart Lines -->
    <rect x="200" y="210" width="112" height="70" rx="14" fill="#0d3b66" />
    <path d="M 226 245 L 246 265 L 286 225" fill="none" stroke="url(#goldGrad)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <!-- Arabic Typography "سوق الولي" -->
  <g text-anchor="middle" font-family="'Cairo', system-ui, sans-serif" font-weight="900">
    <text x="256" y="420" font-size="44" fill="url(#goldLight)" letter-spacing="1">سوق الولي</text>
    <text x="256" y="454" font-size="20" font-weight="700" fill="#34d399">الإلكتروني 🇸🇩</text>
  </g>
  
  <!-- Active Live Indicator -->
  <circle cx="410" cy="102" r="22" fill="#22c55e" stroke="#ffffff" stroke-width="6" filter="url(#shadow)" />
</svg>
`.trim();

fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), svgIcon);
fs.writeFileSync(path.join(ICONS_DIR, 'icon.svg'), svgIcon);
console.log('✓ Created SVG icons');
