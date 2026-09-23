# ⚡ SnapCompress

> **High-performance batch image compressor and WebP/AVIF converter CLI powered by Sharp with lossless tuning, smart resizing, and recursive directory traversal.**

[![CI](https://github.com/mahdyarmonfared/snap-compress/actions/workflows/ci.yml/badge.svg)](https://github.com/mahdyarmonfared/snap-compress/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Large, unoptimized images slow down page loads, kill Google Core Web Vitals (LCP), and eat server bandwidth. **SnapCompress** automates modern format conversion (`WebP`, `AVIF`) and progressive compression directly from your terminal, reducing asset payloads by up to **80%** without visual degradation.

---

## ✨ Key Features

- 🚀 **Next-Gen Format Conversion**: Instant batch conversion from `PNG`, `JPEG`, `TIFF`, `GIF`, and `SVG` to modern `WebP` and `AVIF`.
- 🌐 **Interactive Web GUI & Live Demo (`--web`)**: Drag-and-drop browser interface with real-time quality slider, instant sample images generator, 100% client-side privacy (zero uploads), and batch ZIP export.
- 🗜️ **Lossy & Lossless Modes**: Fine-tune quality targets (`--quality 1-100`) or enforce pixel-perfect `--lossless` compression.
- 📐 **Smart Dimension Constraints**: Resize `--width`, `--height`, or bounding `--max-size` while strictly maintaining aspect ratios and preventing unwanted upscaling.
- 📂 **Recursive Directory Discovery**: Traverses deep asset trees while automatically skipping `node_modules`, build artifacts, and hidden directories.
- 🛡️ **No-Upsize Guard**: Automatically detects if an already-compressed image would grow in size and safely skips it (`--skip-larger`).
- 🧹 **Privacy-First Metadata Stripping**: Strips EXIF, GPS, camera model tags, and color profiles by default (opt-in via `--keep-metadata`).
- 🔍 **Dry-Run Estimation**: Preview compression gains and byte savings without touching or writing a single file to disk (`--dry-run`).
- 🤖 **CI/CD Native**: Produces structured `--json` output and semantic exit codes (`0` clean, `1` errors) for automated GitHub Actions workflows.

---

## 🏗️ Architecture Overview

```text
 ┌──────────────────────────────────────────────────────────────┐
 │                     CLI or Programmatic API                  │
 └──────────────────────────────┬───────────────────────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
         [Directory Scan]               [Single File]
       Recursive FS Walker            Direct Target File
                 │                             │
                 └──────────────┬──────────────┘
                                ▼
                      Supported Image Filter
             (.png, .jpg, .webp, .avif, .tiff, .svg)
                                │
                                ▼
                       Sharp Image Pipeline
                     ┌──────────────────────┐
                     │ • EXIF / GPS Strip   │
                     │ • Smart Aspect Resize│
                     │ • Color Subsampling  │
                     │ • MozJPEG / AVIF /   │
                     │   WebP Encoding      │
                     └──────────┬───────────┘
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
       [Terminal Report Table]            [JSON Export]
       Colorized Savings & Stats          CI/CD Pipeline
```

---

## 🚀 Quick Start

### Installation & Global Setup

```bash
# 1. Clone the repository
git clone https://github.com/mahdyarmonfared/snap-compress.git
cd snap-compress

# 2. Install dependencies
npm install

# 3. Link globally (so you can use `snap-compress` anywhere in your terminal)
npm link
```

### Running SnapCompress

```bash
# Convert all images in ./public to WebP inside ./dist
snap-compress ./public --out ./dist

# Launch the visual web interface locally (default: http://localhost:3005)
snap-compress --web
```

> 💡 **Tip:** You can also run it directly inside the repo without linking using `node bin/snap-compress.js [options]`.

---

## 💡 Practical Examples

### 1. Convert Entire Assets Directory to WebP (Default Quality 80)
```bash
snap-compress ./src/assets -o ./src/assets-optimized
```

### 2. Maximum Compression with Next-Gen AVIF Format
```bash
snap-compress ./raw-photos -f avif -q 70 -o ./optimized-avif
```

### 3. Generate Responsive Thumbnails (Max 600px Bounding Box)
```bash
snap-compress ./gallery -m 600 -q 85 -o ./thumbnails
```

### 4. Optimize In-Place with Automatic Backups
```bash
snap-compress ./static-images --in-place --backup
```

### 5. Simulate Savings Without Writing Files (Dry Run)
```bash
snap-compress ./images --dry-run
```

### 6. Automated CI Pipeline with JSON Output
```bash
snap-compress ./public --dry-run --json > compression-report.json
```

---

## 📋 CLI Options Reference

| Option | Description | Default |
| :--- | :--- | :---: |
| `[target]` | File or folder to scan and compress | `.` |
| `-o, --out <dir>` | Destination folder for compressed images | *Same dir* |
| `-f, --format <type>` | Output format: `webp`, `avif`, `jpeg`, `png`, `auto` | `webp` |
| `-q, --quality <n>` | Encoding quality from `1` to `100` | `80` |
| `-l, --lossless` | Enable lossless encoding mode | `false` |
| `-e, --effort <n>` | CPU compression effort level (`0`-`6`) | `4` |
| `-w, --width <px>` | Constrain target width in pixels | *Original* |
| `-h, --height <px>` | Constrain target height in pixels | *Original* |
| `-m, --max-size <px>` | Maximum width or height constraint | *Original* |
| `--fit <mode>` | Resize fit strategy: `inside`, `cover`, `contain`, `fill` | `inside` |
| `--in-place` | Output compressed images in the source directory | `false` |
| `--backup` | Create `.orig` backup when replacing files in-place | `false` |
| `--no-recursive` | Disable recursive subdirectory traversal | `false` |
| `--keep-metadata` | Retain camera EXIF, GPS, and color profile tags | `false` |
| `--no-skip-larger` | Do not skip file if compressed size exceeds input | `false` |
| `-d, --dry-run` | Compute metrics and estimate savings without disk writes | `false` |
| `-j, --json` | Output machine-readable JSON for CI integration | `false` |
| `-s, --silent` | Suppress spinner and colored summary tables | `false` |
| `--web [port]` | Launch browser Web GUI interface locally | `3005` |

---

## 💻 Programmatic Node.js API

You can also use **SnapCompress** as an importable library in your build scripts or custom Vite/Webpack plugins:

```javascript
import { compressImage, discoverImages, calculateBatchSummary } from 'snap-compress';

// 1. Compress a single file
const result = await compressImage('./banner.png', {
  format: 'webp',
  quality: 80,
  maxSize: 1200,
  outputDir: './dist',
});

console.log(`Saved ${result.percentSaved}% (${result.savedBytes} bytes)!`);

// 2. Discover all images in a folder
const { files } = await discoverImages('./src/assets', { recursive: true });
console.log(`Found ${files.length} images.`);
```

---

## 📊 Sample Output

```text
✔ Optimization complete for 8 images.

┌──────────────────────┬─────────────┬───────────┬────────────┬───────────┬─────────┬──────────────┐
│ File                 │ Orig Format │ Orig Size │ New Format │  New Size │ Saved   │ Status       │
├──────────────────────┼─────────────┼───────────┼────────────┼───────────┼─────────┼──────────────┤
│ hero-banner.png      │     PNG     │   1.84 MB │    WEBP    │ 342.18 KB │ -81.4%  │ ✔ Optimized  │
│ profile-avatar.jpg   │    JPEG     │ 850.40 KB │    WEBP    │ 120.10 KB │ -85.9%  │ ✔ Optimized  │
│ logo-mark.png        │     PNG     │  92.50 KB │    WEBP    │  18.40 KB │ -80.1%  │ ✔ Optimized  │
│ small-badge.webp     │    WEBP     │   4.20 KB │    WEBP    │   4.20 KB │ 0%      │ ⚠ Skipped    │
└──────────────────────┴─────────────┴───────────┴────────────┴───────────┴─────────┴──────────────┘

📊 Compression Summary:
  • Total Files:        4 (3 optimized, 1 skipped, 0 errors)
  • Original Size:      2.78 MB
  • Compressed Size:    484.88 KB
  • Space Reclaimed:    2.31 MB (-83.1%)
  • Execution Time:     0.48s
```

---

## 🤝 Contributing

Contributions, feature requests, and bug reports are welcome! Please check out the [Issues](https://github.com/mahdyarmonfared/snap-compress/issues) page or submit a pull request.

---

## 📜 License

Released under the [MIT License](LICENSE). Copyright © 2026 [Mahdyar Monfared](https://github.com/mahdyarmonfared).
