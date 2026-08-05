import { getDocument, GlobalWorkerOptions } from './pdf.mjs';
import { PDFDocument, degrees } from './pdf-lib.mjs';

// Worker configuration compatible with Chrome extension context
const isExtension = typeof chrome !== 'undefined' && chrome.runtime;
const baseUrl = isExtension ? chrome.runtime.getURL("") : './';

GlobalWorkerOptions.workerSrc = isExtension
  ? chrome.runtime.getURL("pdf.worker.mjs") 
  : './pdf.worker.mjs';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const thumbnailContainer = document.getElementById('thumbnail-container');
const mergeBtn = document.getElementById('merge-btn');
const previewBtn = document.getElementById('preview-btn');
const exportImagesBtn = document.getElementById('export-images-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const exportFilename = document.getElementById('export-filename');
const compressPdfCheckbox = document.getElementById('compress-pdf');
const placeholder = document.getElementById('placeholder');
const workspaceSection = document.getElementById('workspace-section');

// Loading Modal Elements
const loadingModal = document.getElementById('loading-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');

// Zoom Modal Elements
const zoomModal = document.getElementById('zoom-modal');
const zoomContent = document.getElementById('zoom-content');
const zoomTitle = document.getElementById('zoom-title');
const zoomDesc = document.getElementById('zoom-desc');
const closeZoomBtn = document.getElementById('close-zoom');

// Stat Badges Elements
const statFiles = document.getElementById('stat-files');
const statPages = document.getElementById('stat-pages');

// State Management
let pageMap = new Map();
let uniqueFileSet = new Set();

// Utility: Show/Hide Loading Overlay
function showLoading(title, desc) {
  modalTitle.textContent = title;
  modalDesc.textContent = desc;
  loadingModal.classList.add('active');
}

function hideLoading() {
  loadingModal.classList.remove('active');
}

// Helper: Render a PDF or Image page to a new canvas inside a container
async function renderPageToContainer(pageInfo, container, targetWidth = null) {
  const { file, type, pageIndex, rotation } = pageInfo;
  const dpr = window.devicePixelRatio || 1;
  const zoomScale = 2.0; // Higher scale for preview quality

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.5)';
  canvas.style.background = 'white';
  container.appendChild(canvas);

  if (type === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
    const page = await pdfDoc.getPage(pageIndex + 1);

    const baseViewport = page.getViewport({ scale: 1.0, rotation: rotation });
    const scaleFactor = targetWidth ? (targetWidth / baseViewport.width) : 1.0;
    const viewport = page.getViewport({ scale: scaleFactor * zoomScale * dpr, rotation: rotation });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
  } else if (type === 'image') {
    const img = await loadImage(file);

    // Calculate rotated dimensions
    const isHorizontal = rotation % 180 !== 0;
    const width = isHorizontal ? img.height : img.width;
    const height = isHorizontal ? img.width : img.height;

    // Scale image for preview
    const baseScale = targetWidth ? (targetWidth / width) : (800 / Math.max(width, height));
    const scale = baseScale * zoomScale;
    const finalW = width * scale * dpr;
    const finalH = height * scale * dpr;

    canvas.width = finalW;
    canvas.height = finalH;
    canvas.style.width = `${finalW / dpr}px`;
    canvas.style.height = `${finalH / dpr}px`;

    ctx.save();
    ctx.translate(finalW / 2, finalH / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    ctx.drawImage(img, -img.width * scale * dpr / 2, -img.height * scale * dpr / 2, img.width * scale * dpr, img.height * scale * dpr);
    ctx.restore();
  }
  return canvas;
}

// Utility: Zoom Modal Controls
async function openZoomModal(pageId) {
  const info = pageMap.get(pageId);
  if (!info) return;

  zoomTitle.textContent = info.file.name;
  zoomDesc.textContent = info.type === 'pdf' ? `Page ${info.pageIndex + 1} • ${info.rotation}° Rotation` : `Image • ${info.rotation}° Rotation`;

  zoomModal.classList.add('active');
  zoomContent.innerHTML = '';

  try {
    await renderPageToContainer(info, zoomContent);
  } catch (err) {
    console.error('Zoom rendering failed:', err);
    zoomDesc.textContent = 'Error rendering preview.';
  }
}

async function openFullPreview() {
  const currentCards = thumbnailContainer.querySelectorAll('.thumbnail-card');
  if (currentCards.length === 0) return;

  showLoading('Preparing Preview', 'Calculating uniform dimensions and generating view...');

  zoomTitle.textContent = 'Full Document Preview';

  try {
    // Pass 1: Find minimum width across all pages for uniform preview
    let minWidth = Infinity;
    const pageInfos = [];

    for (const card of currentCards) {
      const pageId = card.dataset.pageId;
      const info = pageMap.get(pageId);

      let width;
      if (info.type === 'pdf') {
        const arrayBuffer = await info.file.arrayBuffer();
        const pdfDoc = await getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
        const page = await pdfDoc.getPage(info.pageIndex + 1);
        const viewport = page.getViewport({ scale: 1.0, rotation: info.rotation });
        width = viewport.width;
      } else {
        const img = await loadImage(info.file);
        const isHorizontal = info.rotation % 180 !== 0;
        width = isHorizontal ? img.height : img.width;
      }
      if (width < minWidth) minWidth = width;
      pageInfos.push(info);
    }

    // Limit minWidth to something reasonable for preview if it's huge
    const previewTargetWidth = Math.min(minWidth, 800);

    zoomModal.classList.add('active');
    zoomContent.innerHTML = '';

    for (let i = 0; i < pageInfos.length; i++) {
      await renderPageToContainer(pageInfos[i], zoomContent, previewTargetWidth);
      zoomDesc.textContent = `Rendering Page ${i+1} of ${pageInfos.length}`;
    }

    zoomDesc.textContent = `${pageInfos.length} Pages • Uniform Width Mode`;
  } catch (err) {
    console.error('Full preview failed:', err);
    alert('Failed to generate full preview.');
  } finally {
    hideLoading();
  }
}

function closeZoomModal() {
  zoomModal.classList.remove('active');
  zoomContent.innerHTML = '';
}

closeZoomBtn.addEventListener('click', closeZoomModal);
zoomModal.addEventListener('click', (e) => {
  if (e.target === zoomModal) closeZoomModal();
});

previewBtn.addEventListener('click', openFullPreview);

// Image Export Logic
async function exportPageAsImage(pageId) {
  const info = pageMap.get(pageId);
  if (!info) return;

  showLoading('Exporting Page', 'Rendering high-quality image...');

  try {
    const canvas = await renderPageToContainer(info, document.createElement('div'));
    const dataUrl = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${info.file.name.replace(/\.[^/.]+$/, "")}-page-${info.pageIndex + 1}.png`;
    link.click();
  } catch (err) {
    console.error('Image export failed:', err);
    alert('Failed to export page as image.');
  } finally {
    hideLoading();
  }
}

async function exportAllAsImages() {
  const currentCards = thumbnailContainer.querySelectorAll('.thumbnail-card');
  if (currentCards.length === 0) return;

  showLoading('Exporting All Pages', `Processing 0/${currentCards.length} images...`);

  try {
    for (let i = 0; i < currentCards.length; i++) {
      const pageId = currentCards[i].dataset.pageId;
      const info = pageMap.get(pageId);
      modalDesc.textContent = `Processing page ${i + 1} of ${currentCards.length}...`;

      const canvas = await renderPageToContainer(info, document.createElement('div'));
      const dataUrl = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${info.file.name.replace(/\.[^/.]+$/, "")}-page-${info.pageIndex + 1}.png`;
      link.click();

      await new Promise(resolve => setTimeout(resolve, 300));
    }
  } catch (err) {
    console.error('Bulk image export failed:', err);
    alert('Failed to export all pages as images.');
  } finally {
    hideLoading();
  }
}

exportImagesBtn.addEventListener('click', exportAllAsImages);

function updateStats() {
  const totalPages = pageMap.size;
  const fileCount = uniqueFileSet.size;

  statFiles.textContent = fileCount;
  statPages.textContent = totalPages;

  // Show/hide workspace placeholder
  placeholder.style.display = totalPages === 0 ? 'flex' : 'none';

  // Show/hide the entire workspace section
  if (workspaceSection) {
    workspaceSection.style.display = totalPages > 0 ? 'flex' : 'none';
  }

  // Disable controls if empty
  mergeBtn.disabled = totalPages === 0;
  previewBtn.disabled = totalPages === 0;
  exportImagesBtn.disabled = totalPages === 0;
  clearAllBtn.disabled = totalPages === 0;
}

// Event Listeners for File Selection
fileInput.addEventListener('change', async (event) => {
  const files = Array.from(event.target.files);
  fileInput.value = '';
  await handleFiles(files);
});

dropzone.addEventListener('click', () => {
  fileInput.click();
});

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

  const files = Array.from(e.dataTransfer.files).filter(file => 
    allowedTypes.includes(file.type) ||
    allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  );
  await handleFiles(files);
});

// Primary File Processor
async function handleFiles(files) {
  if (files.length === 0) return;

  showLoading('Loading Files', 'Processing documents and images...');

  for (const file of files) {
    uniqueFileSet.add(file);
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

    if (isImage) {
      await processImageFile(file);
    } else {
      await processPdfFile(file);
    }
  }

  updateStats();
  updateCardBadges();
  hideLoading();
}

async function processImageFile(file) {
  const pageId = 'page-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  pageMap.set(pageId, { file, type: 'image', pageIndex: 0, rotation: 0 });

  const card = createCardElement(pageId, file.name, 'Image Page');
  thumbnailContainer.appendChild(card);

  const canvas = card.querySelector('canvas');
  const context = canvas.getContext('2d');

  try {
    const img = await loadImage(file);
    const dpr = window.devicePixelRatio || 1;

    // Calculate scale to fit thumbnail
    const scale = Math.min(130 / img.width, 150 / img.height);
    const width = img.width * scale * dpr;
    const height = img.height * scale * dpr;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width / dpr}px`;
    canvas.style.height = `${height / dpr}px`;

    context.drawImage(img, 0, 0, width, height);
  } catch (err) {
    console.error('Image preview failed:', err);
  }
}

async function processPdfFile(file) {
  let arrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (err) {
    alert(`Failed to read file ${file.name}: ${err.message}`);
    return;
  }

  let pdfJsDoc;
  try {
    const loadingTask = getDocument({
      data: arrayBuffer,
      wasmUrl: baseUrl,
      standardFontDataUrl: baseUrl + 'standard_fonts/',
      verbosity: 0
    });
    pdfJsDoc = await loadingTask.promise;
  } catch (err) {
    alert(`PDF.js failed to parse ${file.name}: ${err.message}`);
    return;
  }

  const pageCount = pdfJsDoc.numPages;

  for (let i = 1; i <= pageCount; i++) {
    const pageId = 'page-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    pageMap.set(pageId, { file, type: 'pdf', pageIndex: i - 1, rotation: 0 });

    const card = createCardElement(pageId, file.name, `Page ${i} of ${pageCount}`);
    thumbnailContainer.appendChild(card);

    const canvas = card.querySelector('canvas');
    try {
      const page = await pdfJsDoc.getPage(i);
      const unscaledViewport = page.getViewport({ scale: 1.0 });

      const scale = Math.min(130 / unscaledViewport.width, 150 / unscaledViewport.height);
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      const context = canvas.getContext('2d');
      if (context) {
        await page.render({ canvasContext: context, viewport: viewport }).promise;
      }
    } catch (renderErr) {
      console.error(`Page preview rendering failed:`, renderErr);
    }
  }
}

function createCardElement(pageId, fileName, subtitleText) {
  const card = document.createElement('div');
  card.className = 'thumbnail-card';
  card.draggable = true;
  card.dataset.pageId = pageId;

  const badge = document.createElement('div');
  badge.className = 'card-badge';
  card.appendChild(badge);

  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'canvas-container';

  const canvas = document.createElement('canvas');
  canvasContainer.appendChild(canvas);

  // Hover actions overlay
  const overlayActions = document.createElement('div');
  overlayActions.className = 'thumbnail-actions';

  const createIconBtn = (html, title, className, onClick) => {
    const btn = document.createElement('button');
    btn.className = `icon-btn ${className || ''}`;
    btn.innerHTML = html;
    btn.title = title;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick(e);
    });
    return btn;
  };

  const zoomIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
  const downloadImageIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
  const rotLeftIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38"></path></svg>`;
  const rotRightIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"></path></svg>`;
  const deleteIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>`;

  overlayActions.appendChild(createIconBtn(zoomIcon, 'Zoom Page', '', () => openZoomModal(pageId)));
  overlayActions.appendChild(createIconBtn(downloadImageIcon, 'Download as Image', '', () => exportPageAsImage(pageId)));
  overlayActions.appendChild(createIconBtn(rotLeftIcon, 'Rotate Left', '', () => rotatePage(card, pageId, 'left')));
  overlayActions.appendChild(createIconBtn(rotRightIcon, 'Rotate Right', '', () => rotatePage(card, pageId, 'right')));
  overlayActions.appendChild(createIconBtn(deleteIcon, 'Delete Page', 'btn-delete', () => deletePage(card, pageId)));

  canvasContainer.appendChild(overlayActions);
  card.appendChild(canvasContainer);

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = fileName;
  title.title = fileName;

  const subtitle = document.createElement('div');
  subtitle.className = 'card-subtitle';
  subtitle.textContent = subtitleText;

  meta.appendChild(title);
  meta.appendChild(subtitle);
  card.appendChild(meta);

  card.addEventListener('dragstart', (e) => {
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', pageId);
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    updateCardBadges();
  });

  return card;
}

// Utility Helper: Load Image from File
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 2D Spatial drag-over insertion logic
thumbnailContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  const draggingCard = document.querySelector('.dragging');
  if (!draggingCard) return;

  const closest = getDragAfterElement(thumbnailContainer, e.clientX, e.clientY);
  if (!closest.element) {
    thumbnailContainer.appendChild(draggingCard);
  } else if (closest.isAfter) {
    thumbnailContainer.insertBefore(draggingCard, closest.element.nextSibling);
  } else {
    thumbnailContainer.insertBefore(draggingCard, closest.element);
  }
});

function getDragAfterElement(container, x, y) {
  const draggableCards = [...container.querySelectorAll('.thumbnail-card:not(.dragging)')];
  let closest = { offset: Number.POSITIVE_INFINITY, element: null, isAfter: false };

  for (const child of draggableCards) {
    const box = child.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    
    const distance = Math.hypot(x - centerX, y - centerY);

    if (distance < closest.offset) {
      const isAfter = x > centerX;
      closest = { offset: distance, element: child, isAfter };
    }
  }
  return closest;
}

// Update sequence badges
function updateCardBadges() {
  const cards = thumbnailContainer.querySelectorAll('.thumbnail-card');
  cards.forEach((card, index) => {
    const badge = card.querySelector('.card-badge');
    if (badge) {
      badge.textContent = index + 1;
    }
  });
}

// Page Rotation State Handler
function rotatePage(card, pageId, direction) {
  const info = pageMap.get(pageId);
  if (!info) return;

  if (direction === 'left') {
    info.rotation = (info.rotation - 90 + 360) % 360;
  } else {
    info.rotation = (info.rotation + 90) % 360;
  }

  const canvas = card.querySelector('canvas');
  if (canvas) {
    canvas.style.transform = `rotate(${info.rotation}deg)${info.rotation % 180 !== 0 ? ' scale(0.75)' : ''}`;
  }
}

// Page Deletion State Handler
function deletePage(card, pageId) {
  card.remove();
  pageMap.delete(pageId);

  // Recalculate unique files set
  const remainingFiles = new Set(Array.from(pageMap.values()).map(item => item.file));
  uniqueFileSet = remainingFiles;

  updateStats();
  updateCardBadges();
}

// Clear Workspace Handler
clearAllBtn.addEventListener('click', () => {
  pageMap.clear();
  uniqueFileSet.clear();
  
  // Clear all thumbnail-card children (preserving placeholder)
  const cards = thumbnailContainer.querySelectorAll('.thumbnail-card');
  cards.forEach(card => card.remove());

  updateStats();
});

// PDF Merge Engine
async function generateMergedPdfBytes() {
  const currentCards = thumbnailContainer.querySelectorAll('.thumbnail-card');
  if (currentCards.length === 0) return null;

  const newPdf = await PDFDocument.create();
  const loadedPdfDocs = new Map();
  const pageSpecs = [];

  // Pass 1: Identify all pages and find the minimum width
  let minWidth = Infinity;

  for (const card of currentCards) {
    const pageId = card.dataset.pageId;
    const info = pageMap.get(pageId);
    if (!info) continue;

    let width, height;

    if (info.type === 'pdf') {
      let pdfDoc = loadedPdfDocs.get(info.file);
      if (!pdfDoc) {
        const arrayBuffer = await info.file.arrayBuffer();
        pdfDoc = await PDFDocument.load(arrayBuffer);
        loadedPdfDocs.set(info.file, pdfDoc);
      }
      const page = pdfDoc.getPage(info.pageIndex);
      const size = page.getSize();
      // Calculate effective dimensions based on total rotation (PDF internal + User applied)
      const totalRotation = (page.getRotation().angle + info.rotation) % 360;
      const isHorizontal = totalRotation % 180 !== 0;
      width = isHorizontal ? size.height : size.width;
      height = isHorizontal ? size.width : size.height;

      pageSpecs.push({ type: 'pdf', srcDoc: pdfDoc, srcIndex: info.pageIndex, rotation: info.rotation, width, height });
    } else if (info.type === 'image') {
      const imageBytes = await info.file.arrayBuffer();
      let embeddedImg;
      if (info.file.type === 'image/png') {
        embeddedImg = await newPdf.embedPng(imageBytes);
      } else {
        embeddedImg = await newPdf.embedJpg(imageBytes);
      }
      const size = embeddedImg.scale(1.0);
      const isHorizontal = info.rotation % 180 !== 0;
      width = isHorizontal ? size.height : size.width;
      height = isHorizontal ? size.width : size.height;

      pageSpecs.push({ type: 'image', embeddedImg, rotation: info.rotation, width, height, originalW: size.width, originalH: size.height, mimeType: info.file.type });
    }

    if (width < minWidth) minWidth = width;
  }

  // Pass 2: Merge and scale all pages to match minWidth
  for (const spec of pageSpecs) {
    const scaleFactor = minWidth / spec.width;

    if (spec.type === 'pdf') {
      const [copiedPage] = await newPdf.copyPages(spec.srcDoc, [spec.srcIndex]);

      // Apply user rotation
      if (spec.rotation !== 0) {
        const originalRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((originalRotation + spec.rotation) % 360));
      }

      // Proportional scale to match minWidth
      if (scaleFactor !== 1) {
        copiedPage.scale(scaleFactor, scaleFactor);
      }
      newPdf.addPage(copiedPage);
    } else {
      // Create new page with scaled dimensions
      const targetW = spec.width * scaleFactor; // will be minWidth
      const targetH = spec.height * scaleFactor;
      const page = newPdf.addPage([targetW, targetH]);

      const imgW = spec.originalW * scaleFactor;
      const imgH = spec.originalH * scaleFactor;

      // Draw image with rotation and adjusted origin
      page.drawImage(spec.embeddedImg, {
        x: (spec.rotation === 90 || spec.rotation === 180) ? targetW : 0,
        y: (spec.rotation === 180 || spec.rotation === 270) ? targetH : 0,
        width: imgW,
        height: imgH,
        rotate: degrees(spec.rotation)
      });
    }
  }

  const useCompression = compressPdfCheckbox ? compressPdfCheckbox.checked : true;
  return await newPdf.save({ useObjectStreams: useCompression });
}

// PDF Merge & Export Action
mergeBtn.addEventListener('click', async () => {
  const currentCards = thumbnailContainer.querySelectorAll('.thumbnail-card');
  if (currentCards.length === 0) {
    alert('Please load at least one PDF page.');
    return;
  }

  showLoading('Generating Merged PDF', 'Reordering pages, applying rotation offsets, and building file structure...');

  try {
    const pdfBytes = await generateMergedPdfBytes();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    // Apply custom output filename
    let filename = exportFilename.value.trim();
    if (!filename) filename = 'merged-document.pdf';
    if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

    link.download = filename;
    link.click();
  } catch (error) {
    console.error('Error merging PDF files:', error);
    alert(`Failed to merge PDF files: ${error.message}`);
  } finally {
    hideLoading();
  }
});

// Initialize UI state
updateStats();