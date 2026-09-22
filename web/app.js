/**
 * SnapCompress Web UI Client-Side Engine
 * 100% Client-Side Private Image Compression & Conversion
 */

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const formatSelect = document.getElementById('formatSelect');
const qualityRange = document.getElementById('qualityRange');
const qualityVal = document.getElementById('qualityVal');
const maxSizeInput = document.getElementById('maxSizeInput');
const presetBtns = document.querySelectorAll('.preset-btn');
const resultsSection = document.getElementById('resultsSection');
const cardsGrid = document.getElementById('cardsGrid');
const fileCount = document.getElementById('fileCount');
const totalSavingsBadge = document.getElementById('totalSavingsBadge');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

// Mega Menu elements
const formatDropdown = document.getElementById('formatDropdown');
const formatTrigger = document.getElementById('formatTrigger');
const triggerIcon = document.getElementById('triggerIcon');
const triggerName = document.getElementById('triggerName');
const triggerBadge = document.getElementById('triggerBadge');
const megaCards = document.querySelectorAll('.mega-card');

// Stepper elements
const dimMinusBtn = document.getElementById('dimMinusBtn');
const dimPlusBtn = document.getElementById('dimPlusBtn');
const dimPresetLabel = document.getElementById('dimPresetLabel');
const dimPresetBtns = document.querySelectorAll('.dim-preset-btn');

// State
let processedImages = [];

/**
 * Format bytes into human-readable text
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Mega Menu Format Selector Logic
 */
formatTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  formatDropdown.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!formatDropdown.contains(e.target)) {
    formatDropdown.classList.remove('open');
  }
});

const FORMAT_CONFIGS = {
  webp: { name: 'WebP', icon: '⚡', badgeText: 'Recommended', badgeClass: 'badge-recommended' },
  avif: { name: 'AVIF', icon: '🚀', badgeText: 'Next-Gen', badgeClass: 'badge-nextgen' },
  jpeg: { name: 'JPEG', icon: '📷', badgeText: 'Universal', badgeClass: 'badge-legacy' },
  png: { name: 'PNG', icon: '💎', badgeText: 'Pixel-Crisp', badgeClass: 'badge-crisp' },
};

megaCards.forEach(card => {
  card.addEventListener('click', () => {
    const format = card.dataset.format;
    formatSelect.value = format;

    // Update trigger UI
    const cfg = FORMAT_CONFIGS[format];
    if (cfg) {
      triggerIcon.textContent = cfg.icon;
      triggerName.textContent = cfg.name;
      triggerBadge.textContent = cfg.badgeText;
      triggerBadge.className = `format-badge ${cfg.badgeClass}`;
    }

    // Update active card
    megaCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    // Close menu
    formatDropdown.classList.remove('open');
  });
});

/**
 * Custom Stepper & Dimension Presets Logic
 */
function updateDimensionUI(val) {
  if (!val || val <= 0) {
    maxSizeInput.value = '';
    dimPresetLabel.textContent = 'Original';
  } else {
    maxSizeInput.value = val;
    dimPresetLabel.textContent = `${val}px`;
  }

  // Update preset buttons active state
  dimPresetBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dim === (val ? String(val) : ''));
  });
}

dimPlusBtn.addEventListener('click', () => {
  const current = parseInt(maxSizeInput.value, 10);
  const next = isNaN(current) ? 800 : Math.min(8000, current + 100);
  updateDimensionUI(next);
});

dimMinusBtn.addEventListener('click', () => {
  const current = parseInt(maxSizeInput.value, 10);
  if (isNaN(current) || current <= 100) {
    updateDimensionUI('');
  } else {
    updateDimensionUI(Math.max(100, current - 100));
  }
});

maxSizeInput.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  updateDimensionUI(isNaN(val) ? '' : val);
});

dimPresetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const dim = btn.dataset.dim;
    updateDimensionUI(dim ? parseInt(dim, 10) : '');
  });
});

/**
 * Update UI for Quality Slider
 */
qualityRange.addEventListener('input', (e) => {
  const q = e.target.value;
  qualityVal.textContent = `${q}%`;
  presetBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.q === q);
  });
});

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const q = btn.dataset.q;
    qualityRange.value = q;
    qualityVal.textContent = `${q}%`;
    presetBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Drag and drop event listeners
['dragenter', 'dragover'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
  });
});

['dragleave', 'drop'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
  });
});

dropZone.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length > 0) {
    handleFiles(files);
  }
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
  if (files.length > 0) {
    handleFiles(files);
  }
});

/**
 * Map selected format to MIME type
 */
function getMimeType(format) {
  switch (format) {
    case 'webp': return 'image/webp';
    case 'avif': return 'image/avif';
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    default: return 'image/webp';
  }
}

/**
 * Compress a single File via HTML5 Canvas
 */
async function compressFile(file, options) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Apply max dimension constraint
        if (options.maxSize && (width > options.maxSize || height > options.maxSize)) {
          if (width > height) {
            height = Math.round((height * options.maxSize) / width);
            width = options.maxSize;
          } else {
            width = Math.round((width * options.maxSize) / height);
            height = options.maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        const mime = getMimeType(options.format);
        const quality = options.quality / 100;

        canvas.toBlob((blob) => {
          if (!blob) {
            // Fallback to webp or jpeg if browser doesn't support encoding AVIF directly
            canvas.toBlob((fallbackBlob) => {
              finish(fallbackBlob, 'webp');
            }, 'image/webp', quality);
            return;
          }
          finish(blob, options.format);
        }, mime, quality);

        function finish(blob, finalFormat) {
          const originalBytes = file.size;
          const compressedBytes = blob.size;
          const savedBytes = Math.max(0, originalBytes - compressedBytes);
          const percentSaved = originalBytes > 0 
            ? Number(((savedBytes / originalBytes) * 100).toFixed(1))
            : 0;

          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const outputName = `${baseName}.${finalFormat === 'jpeg' ? 'jpg' : finalFormat}`;
          const objectUrl = URL.createObjectURL(blob);

          resolve({
            name: file.name,
            outputName,
            originalBytes,
            compressedBytes,
            savedBytes,
            percentSaved,
            outputFormat: finalFormat,
            blob,
            objectUrl,
            width,
            height,
          });
        }
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Process array of image files
 */
async function handleFiles(files) {
  const options = {
    format: formatSelect.value,
    quality: parseInt(qualityRange.value, 10),
    maxSize: maxSizeInput.value ? parseInt(maxSizeInput.value, 10) : null,
  };

  for (const file of files) {
    try {
      const result = await compressFile(file, options);
      processedImages.push(result);
    } catch (err) {
      console.error('Failed to compress:', file.name, err);
    }
  }

  renderResults();
}

/**
 * Render all image cards and summary stats
 */
function renderResults() {
  if (processedImages.length === 0) {
    resultsSection.classList.add('hidden');
    return;
  }

  resultsSection.classList.remove('hidden');
  cardsGrid.innerHTML = '';

  let totalOrig = 0;
  let totalComp = 0;

  processedImages.forEach((img, idx) => {
    totalOrig += img.originalBytes;
    totalComp += img.compressedBytes;

    const card = document.createElement('div');
    card.className = 'image-card';
    card.innerHTML = `
      <div class="card-preview-container">
        <img src="${img.objectUrl}" alt="${img.name}" class="card-preview-img">
      </div>
      <div class="card-info">
        <div class="card-filename" title="${img.name}">${img.outputName}</div>
        <div class="card-metrics">
          <span>${formatBytes(img.originalBytes)} ➔ <strong>${formatBytes(img.compressedBytes)}</strong></span>
          <span class="card-savings-tag">-${img.percentSaved}%</span>
        </div>
      </div>
      <a href="${img.objectUrl}" download="${img.outputName}" class="card-download-btn">
        ⬇ Download ${img.outputFormat.toUpperCase()}
      </a>
    `;
    cardsGrid.appendChild(card);
  });

  const totalSaved = Math.max(0, totalOrig - totalComp);
  const totalPercent = totalOrig > 0 ? ((totalSaved / totalOrig) * 100).toFixed(1) : 0;

  fileCount.textContent = processedImages.length;
  totalSavingsBadge.textContent = `-${totalPercent}% Saved (${formatBytes(totalSaved)} Total)`;
}

/**
 * Download all compressed images as a ZIP
 */
downloadAllBtn.addEventListener('click', async () => {
  if (processedImages.length === 0) return;

  const originalText = downloadAllBtn.textContent;
  downloadAllBtn.textContent = '⏳ Creating ZIP...';
  downloadAllBtn.disabled = true;

  try {
    const zip = new JSZip();
    processedImages.forEach(img => {
      zip.file(img.outputName, img.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'snap-compressed-images.zip';
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    console.error('ZIP generation failed:', err);
    alert('Failed to generate ZIP.');
  } finally {
    downloadAllBtn.textContent = originalText;
    downloadAllBtn.disabled = false;
  }
});

/**
 * Clear all processed images
 */
function clearAll() {
  processedImages.forEach(img => URL.revokeObjectURL(img.objectUrl));
  processedImages = [];
  renderResults();
  fileInput.value = '';
}

clearAllBtn.addEventListener('click', clearAll);

const toolbarClearBtn = document.getElementById('toolbarClearBtn');
if (toolbarClearBtn) {
  toolbarClearBtn.addEventListener('click', clearAll);
}

// Quick Demo Generator
const loadDemoBtn = document.getElementById('loadDemoBtn');
if (loadDemoBtn) {
  loadDemoBtn.addEventListener('click', async () => {
    loadDemoBtn.textContent = '⏳ Generating Demo...';
    loadDemoBtn.disabled = true;

    try {
      // 1. Generate realistic Landscape canvas (1920x1080)
      const c1 = document.createElement('canvas');
      c1.width = 1920;
      c1.height = 1080;
      const ctx1 = c1.getContext('2d');
      const grad1 = ctx1.createLinearGradient(0, 0, 1920, 1080);
      grad1.addColorStop(0, '#0a0f1d');
      grad1.addColorStop(0.5, '#0284c7');
      grad1.addColorStop(1, '#6366f1');
      ctx1.fillStyle = grad1;
      ctx1.fillRect(0, 0, 1920, 1080);

      // Add visual glow circles
      ctx1.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx1.beginPath();
      ctx1.arc(960, 540, 320, 0, Math.PI * 2);
      ctx1.fill();

      ctx1.font = 'bold 72px -apple-system, sans-serif';
      ctx1.fillStyle = '#ffffff';
      ctx1.textAlign = 'center';
      ctx1.fillText('SnapCompress 4K Sample', 960, 510);
      ctx1.font = '32px -apple-system, sans-serif';
      ctx1.fillStyle = '#94a3b8';
      ctx1.fillText('Uncompressed High-Res Asset • 1920×1080', 960, 580);

      const blob1 = await new Promise(r => c1.toBlob(r, 'image/jpeg', 0.95));
      const file1 = new File([blob1], 'landscape_wallpaper_4k.jpg', { type: 'image/jpeg', lastModified: Date.now() });

      // 2. Generate Crisp Product Vector Canvas (800x800)
      const c2 = document.createElement('canvas');
      c2.width = 800;
      c2.height = 800;
      const ctx2 = c2.getContext('2d');
      ctx2.fillStyle = '#0f172a';
      ctx2.fillRect(0, 0, 800, 800);

      const grad2 = ctx2.createLinearGradient(120, 120, 680, 680);
      grad2.addColorStop(0, '#38bdf8');
      grad2.addColorStop(1, '#8b5cf6');
      ctx2.fillStyle = grad2;
      ctx2.beginPath();
      ctx2.arc(400, 400, 220, 0, Math.PI * 2);
      ctx2.fill();

      ctx2.font = 'bold 54px -apple-system, sans-serif';
      ctx2.fillStyle = '#ffffff';
      ctx2.textAlign = 'center';
      ctx2.fillText('Vector Icon', 400, 415);

      const blob2 = await new Promise(r => c2.toBlob(r, 'image/png'));
      const file2 = new File([blob2], 'brand_badge_icon.png', { type: 'image/png', lastModified: Date.now() });

      await handleFiles([file1, file2]);
    } catch (err) {
      console.error('Demo generation error:', err);
    } finally {
      loadDemoBtn.textContent = '⚡ Load Sample Demo Images';
      loadDemoBtn.disabled = false;
    }
  });
}

