import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  X, 
  AlertCircle, 
  BookOpen, 
  Loader2,
  Camera,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { extractTextFromPdf, renderPdfPagesToImages } from '../services/pdfService';
import { batchProcessHandwrittenPages, fileToDataUrl } from '../services/ocrVisionService';
import { getSettings } from '../services/storageService';

export default function UploadModal({
  onSelectDocument,
  onClose
}) {
  const [activeMode, setActiveMode] = useState('pdf'); // 'pdf' | 'handwritten' | 'text'
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  // Scanned detection flow
  const [detectedScannedFile, setDetectedScannedFile] = useState(null);

  const settings = getSettings();

  // 1. Handle Standard PDF Upload
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setProgressMsg('Extracting text & checking page density...');

    try {
      const result = await extractTextFromPdf(file);

      // Check if document appears to be handwritten or scanned images
      if (result.isScannedLikely) {
        setDetectedScannedFile({ file, result });
        setIsProcessing(false);
        return;
      }

      onSelectDocument({
        id: `pdf-${Date.now()}`,
        title: result.title || file.name,
        category: "Uploaded PDF",
        content: result.text,
        isScannedLikely: false
      });
      onClose();
    } catch (err) {
      console.error("PDF Extraction error:", err);
      setErrorMsg("Could not extract text from this PDF. It may be password-protected or contain only scanned images.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Run Vision AI Scan on Scanned/Handwritten PDF
  const handleRunVisionScan = async () => {
    if (!detectedScannedFile?.file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      setProgressMsg('Rendering high-resolution pages for Vision AI...');
      const pageImages = await renderPdfPagesToImages(detectedScannedFile.file, 6, 2.0);

      const decipheredText = await batchProcessHandwrittenPages(
        pageImages,
        settings.geminiApiKey,
        (current, total, status) => setProgressMsg(status)
      );

      onSelectDocument({
        id: `handwritten-${Date.now()}`,
        title: `${detectedScannedFile.file.name.replace(/\.[^/.]+$/, '')} (AI Deciphered)`,
        category: "Handwritten Notes",
        content: decipheredText,
        isScannedLikely: true
      });
      onClose();
    } catch (err) {
      console.error("Vision scan failed:", err);
      setErrorMsg("Vision OCR encountered an error. Please verify your Gemini API key in settings or paste notes directly.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Handle Direct Handwritten Camera/Photo Upload
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setProgressMsg(`Reading ${files.length} photo(s)...`);

    try {
      const dataUrls = await Promise.all(files.map(f => fileToDataUrl(f)));

      const decipheredText = await batchProcessHandwrittenPages(
        dataUrls,
        settings.geminiApiKey,
        (current, total, status) => setProgressMsg(status)
      );

      onSelectDocument({
        id: `camera-notes-${Date.now()}`,
        title: `Handwritten Lecture Notes (${new Date().toLocaleDateString()})`,
        category: "Handwritten Notes",
        content: decipheredText,
        isScannedLikely: true
      });
      onClose();
    } catch (err) {
      console.error("Camera OCR error:", err);
      setErrorMsg("Could not decipher image files. Please check file format or paste text.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Handle Pasted Notes
  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;

    onSelectDocument({
      id: `custom-${Date.now()}`,
      title: pastedTitle.trim() || "Pasted Study Notes",
      category: "Custom Notes",
      content: pastedText.trim()
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <span className="doc-category-tag" style={{ marginBottom: '4px' }}>
              <BookOpen size={12} /> Study Material Ingestion
            </span>
            <h2 style={{ fontSize: '1.35rem', marginTop: '4px' }}>Load Material into StudyFetch</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="nav-links" style={{ marginBottom: '20px', width: 'fit-content' }}>
          <button 
            className={`nav-tab ${activeMode === 'pdf' ? 'active' : ''}`}
            onClick={() => { setActiveMode('pdf'); setDetectedScannedFile(null); }}
          >
            <Upload size={14} />
            <span>Upload PDF</span>
          </button>

          <button 
            className={`nav-tab ${activeMode === 'handwritten' ? 'active' : ''}`}
            onClick={() => { setActiveMode('handwritten'); setDetectedScannedFile(null); }}
          >
            <Camera size={14} />
            <span>Handwritten / Photos</span>
          </button>

          <button 
            className={`nav-tab ${activeMode === 'text' ? 'active' : ''}`}
            onClick={() => { setActiveMode('text'); setDetectedScannedFile(null); }}
          >
            <FileText size={14} />
            <span>Paste Notes</span>
          </button>
        </div>

        {/* 1. PDF Upload Mode */}
        {activeMode === 'pdf' && !detectedScannedFile && (
          <div>
            <div 
              style={{
                border: '2px dashed var(--border-focus)',
                borderRadius: 'var(--r-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                background: 'rgba(127, 29, 58, 0.05)',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handlePdfUpload}
                disabled={isProcessing}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              />
              {isProcessing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <Loader2 size={36} color="var(--accent)" className="spin-anim" />
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{progressMsg}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div className="brand-icon" style={{ width: '48px', height: '48px' }}>
                    <Upload size={22} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
                      Click or drag and drop your PDF here
                    </p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
                      Supports textbook chapters, lecture slides, and research papers
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scanned/Handwritten PDF Detected Alert Screen */}
        {detectedScannedFile && (
          <div style={{ padding: '20px', background: 'rgba(127, 29, 58, 0.06)', borderRadius: 'var(--r-lg)', border: '1px solid rgba(127, 29, 58, 0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent)' }}>
              <Sparkles size={20} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                Handwritten / Scanned Document Detected!
              </h3>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '16px' }}>
              We detected that <strong>{detectedScannedFile.file.name}</strong> contains scanned bitmap pages or handwriting. Our Multimodal Vision AI can scan and decipher formulas, cursive, and diagrams into structured notes.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setDetectedScannedFile(null)}>
                Choose Another
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleRunVisionScan}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 size={15} className="spin-anim" /> : <Sparkles size={15} />}
                <span>{isProcessing ? progressMsg : 'Run Vision AI Scan'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Handwritten & Camera Photos Mode */}
        {activeMode === 'handwritten' && (
          <div>
            <div 
              style={{
                border: '2px dashed var(--accent)',
                borderRadius: 'var(--r-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                background: 'rgba(127, 29, 58, 0.05)',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <input 
                type="file" 
                accept="image/*" 
                multiple
                onChange={handleImageUpload}
                disabled={isProcessing}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              />
              {isProcessing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <Loader2 size={36} color="var(--accent)" className="spin-anim" />
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{progressMsg}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div className="brand-icon" style={{ width: '48px', height: '48px', background: 'var(--accent)' }}>
                    <Camera size={22} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
                      Upload Camera Photos of Notebook or Whiteboard
                    </p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
                      Supports multiple .PNG, .JPG, or camera snapshots. Multimodal AI deciphers cursive & equations.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Paste Text Mode */}
        {activeMode === 'text' && (
          <div>
            <div className="form-group">
              <label className="form-label">Document Title:</label>
              <input 
                type="text" 
                placeholder="e.g. Distributed Consensus Notes"
                value={pastedTitle}
                onChange={(e) => setPastedTitle(e.target.value)}
                className="form-input" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes or Markdown Text:</label>
              <textarea 
                rows={8}
                placeholder="Paste dense lecture notes, chapter summaries, or markdown here..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="form-textarea" 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button 
                className="btn btn-primary"
                onClick={handlePasteSubmit}
                disabled={!pastedText.trim()}
              >
                <span>Open in Study Hub</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', color: 'var(--red)', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
