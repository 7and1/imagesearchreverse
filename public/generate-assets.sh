#!/bin/bash
# Script to generate PNG/ICO assets from SVG files
# Requires: librsvg (brew install librsvg) and ImageMagick (brew install imagemagick)

set -e

cd "$(dirname "$0")"

echo "Generating og-image.png (1200x630)..."
if command -v rsvg-convert &> /dev/null; then
  rsvg-convert -w 1200 -h 630 og-image.svg > og-image.png
  echo "  Created og-image.png"
else
  echo "  Warning: rsvg-convert not found. Install with: brew install librsvg"
fi

echo "Generating logo.png (512x512)..."
if command -v rsvg-convert &> /dev/null; then
  rsvg-convert -w 512 -h 512 logo.svg > logo.png
  echo "  Created logo.png"
fi

echo "Generating favicon.ico (multi-resolution)..."
if command -v rsvg-convert &> /dev/null && command -v convert &> /dev/null; then
  # Generate multiple sizes
  rsvg-convert -w 16 -h 16 favicon.svg > favicon-16.png
  rsvg-convert -w 32 -h 32 favicon.svg > favicon-32.png
  rsvg-convert -w 48 -h 48 favicon.svg > favicon-48.png

  # Combine into ICO
  convert favicon-16.png favicon-32.png favicon-48.png favicon.ico

  # Cleanup temp files
  rm -f favicon-16.png favicon-32.png favicon-48.png
  echo "  Created favicon.ico"
else
  echo "  Warning: ImageMagick not found. Install with: brew install imagemagick"
fi

echo "Done!"
