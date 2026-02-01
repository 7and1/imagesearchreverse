// Script to generate PNG assets from SVG files
// Run with: node scripts/generate-assets.mjs

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

async function generateAssets() {
  console.log('Generating image assets...\n');

  // Generate og-image.png (1200x630)
  try {
    const ogSvg = readFileSync(join(publicDir, 'og-image.svg'));
    await sharp(ogSvg)
      .resize(1200, 630)
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(join(publicDir, 'og-image.png'));
    console.log('Created og-image.png (1200x630)');
  } catch (err) {
    console.error('Failed to create og-image.png:', err.message);
  }

  // Generate logo.png (512x512)
  try {
    const logoSvg = readFileSync(join(publicDir, 'logo.svg'));
    await sharp(logoSvg)
      .resize(512, 512)
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(join(publicDir, 'logo.png'));
    console.log('Created logo.png (512x512)');
  } catch (err) {
    console.error('Failed to create logo.png:', err.message);
  }

  // Generate favicon sizes
  try {
    const faviconSvg = readFileSync(join(publicDir, 'favicon.svg'));

    // Generate individual sizes for ICO
    const sizes = [16, 32, 48];
    const buffers = await Promise.all(
      sizes.map(size =>
        sharp(faviconSvg)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );

    // For favicon.ico, we'll create a simple version using the 32x32
    // A proper ICO would need a specialized library, but browsers also accept PNG
    await sharp(faviconSvg)
      .resize(32, 32)
      .png()
      .toFile(join(publicDir, 'favicon.png'));
    console.log('Created favicon.png (32x32)');

    // Also create a 48x48 version
    await sharp(faviconSvg)
      .resize(48, 48)
      .png()
      .toFile(join(publicDir, 'favicon-48.png'));
    console.log('Created favicon-48.png (48x48)');

  } catch (err) {
    console.error('Failed to create favicon:', err.message);
  }

  console.log('\nDone! Note: For favicon.ico, use an online converter or ImageMagick.');
}

generateAssets().catch(console.error);
