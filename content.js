(function() {
  if (document.getElementById('pdf-tools-modal-overlay')) return;

  // Detect current PDF URL if open on the active tab
  const currentUrl = window.location.href;
  const isPdf = currentUrl.toLowerCase().endsWith('.pdf') || currentUrl.includes('pdf');
  const targetPdfUrl = isPdf ? currentUrl : '';

  const overlay = document.createElement('div');
  overlay.id = 'pdf-tools-modal-overlay';
  overlay.innerHTML = `
    <div id="pdf-tools-modal-card">
      <div class="pdf-tools-header">
        <h2>PDF Tools Dashboard</h2>
        <button id="pdf-tools-close-btn">&times;</button>
      </div>
      <div class="pdf-tools-body">
        <div class="pdf-tools-content-grid">
          <!-- Left Column: PDF Preview / Status -->
          <div class="pdf-tools-preview-pane">
            <h3>Active Document</h3>
            ${targetPdfUrl ? `
              <div class="pdf-preview-container">
                <iframe src="${targetPdfUrl}#toolbar=0" title="PDF Preview"></iframe>
              </div>
              <p class="pdf-url-text" title="${targetPdfUrl}">${targetPdfUrl}</p>
            ` : `
              <div class="pdf-empty-preview">
                <p>No direct PDF detected in this tab.</p>
                <div class="pdf-tools-dropzone">
                  <p>Drag & Drop local file or <strong>Browse</strong></p>
                </div>
              </div>
            `}
          </div>

          <!-- Right Column: Tools Options -->
          <div class="pdf-tools-options-pane">
            <h3>Available Actions</h3>
            <div class="tool-action-card">
              <h4>Merge PDFs</h4>
              <p>Combine multiple documents into a single file.</p>
              <button class="tool-btn" id="mergeBtn">Select Files</button>
            </div>
            <div class="tool-action-card">
              <h4>Split PDF</h4>
              <p>Extract specific pages or ranges.</p>
              <button class="tool-btn" id="splitBtn">Configure Split</button>
            </div>
            <div class="tool-action-card">
              <h4>Convert Format</h4>
              <p>Transform to images, Word, or back to PDF.</p>
              <button class="tool-btn" id="convertBtn">Choose Format</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <style>
      #pdf-tools-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.65);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      #pdf-tools-modal-card {
        background: #ffffff;
        width: 850px;
        max-width: 95vw;
        height: 600px;
        max-height: 90vh;
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: pdfModalFadeIn 0.2s ease-out;
      }
      @keyframes pdfModalFadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .pdf-tools-header {
        background: #f8fafc;
        padding: 16px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e2e8f0;
      }
      .pdf-tools-header h2 {
        margin: 0;
        font-size: 18px;
        color: #0f172a;
      }
      #pdf-tools-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #64748b;
        padding: 0 4px;
      }
      #pdf-tools-close-btn:hover {
        color: #0f172a;
      }
      .pdf-tools-body {
        padding: 24px;
        flex: 1;
        overflow-y: auto;
        background: #f8fafc;
      }
      .pdf-tools-content-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        height: 100%;
      }
      .pdf-tools-preview-pane, .pdf-tools-options-pane {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
      }
      .pdf-tools-preview-pane h3, .pdf-tools-options-pane h3 {
        margin-top: 0;
        font-size: 15px;
        color: #1e293b;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 8px;
      }
      .pdf-preview-container {
        flex: 1;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        overflow: hidden;
        background: #e2e8f0;
        margin-bottom: 8px;
        min-height: 250px;
      }
      .pdf-preview-container iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
      .pdf-url-text {
        font-size: 11px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin: 0;
      }
      .pdf-empty-preview {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        color: #64748b;
        font-size: 13px;
        text-align: center;
      }
      .pdf-tools-dropzone {
        border: 2px dashed #cbd5e1;
        border-radius: 6px;
        padding: 20px;
        background: #f8fafc;
        margin-top: 10px;
        cursor: pointer;
      }
      .pdf-tools-dropzone:hover {
        border-color: #3b82f6;
        background: #eff6ff;
      }
      .tool-action-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 10px;
      }
      .tool-action-card h4 {
        margin: 0 0 4px 0;
        font-size: 13px;
        color: #0f172a;
      }
      .tool-action-card p {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: #64748b;
      }
      .tool-btn {
        width: 100%;
        padding: 6px 10px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
      }
      .tool-btn:hover {
        background: #1d4ed8;
      }
    </style>
  `;

  document.body.appendChild(overlay);

  document.getElementById('pdf-tools-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
})();