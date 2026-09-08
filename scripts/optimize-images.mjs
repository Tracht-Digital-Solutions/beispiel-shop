import sharp from 'sharp';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

// Input: JSON array of { name, path } entries pointing to original source images.
// Example: node scripts/optimize-images.mjs /absolute/path/to/image-manifest.json
const manifestPath = process.argv[2];
if (!manifestPath) throw new Error('Pass a source image manifest JSON path.');
const entries = JSON.parse(await readFile(manifestPath, 'utf8'));
const outputDir = path.resolve('public/images');
await mkdir(outputDir, { recursive: true });

for (const { name, path: sourcePath } of entries) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Invalid asset name: ${name}`);
  const variants =
    name === 'hero'
      ? [
          ['', 1920],
          ['-960', 960],
        ]
      : name.startsWith('look-')
        ? [
            ['', 1200],
            ['-600', 600],
          ]
        : [
            ['', 1200],
            ['-800', 800],
            ['-480', 480],
          ];
  for (const [suffix, width] of variants) {
    const target = path.join(outputDir, `${name}${suffix}.webp`);
    await sharp(sourcePath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: suffix ? 78 : 84, effort: 6 })
      .toFile(target);
    const { size } = await stat(target);
    console.log(`${name}${suffix}.webp: ${Math.round(size / 1024)} KB`);
  }
}
