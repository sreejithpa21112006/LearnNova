import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  X, 
  AlertCircle, 
  BookOpen, 
  Loader2
} from 'lucide-react';
import { extractTextFromPdf } from '../services/pdfService';

export default function UploadModal({
  onSelectDocument,
  onClose
}) {
  const [activeMode, setActiveMode] = useState('pdf'); // 'pdf' | 'text'
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPdf(true);
    setPdfError(null);

    try {
      const result = await extractTextFromPdf(file);
      onSelectDocument({
        id: `pdf-${Date.now()}`,
        title: result.title || file.name,
        category: "Uploaded PDF",
        content: result.text,
        isScannedLikely: result.isScannedLikely
      });
      onClose();
    } catch (err) {
      console.error("PDF Extraction error:", err);
      setPdfError("Could not extract text from this PDF. Please ensure it's not password-protected, or paste the text directly.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

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
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <span className="doc-category-tag" style={{ marginBottom: '4px' }}>
              <BookOpen size={12} /> Choose Study Material
            </span>
            <h2 style={{ fontSize: '1.35rem', marginTop: '4px' }}>Load Document into LearnNova</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="nav-links" style={{ marginBottom: '20px', width: 'fit-content' }}>
          <button 
            className={`nav-tab ${activeMode === 'pdf' ? 'active' : ''}`}
            onClick={() => setActiveMode('pdf')}
          >
            <Upload size={14} />
            <span>Upload PDF</span>
          </button>

          <button 
            className={`nav-tab ${activeMode === 'text' ? 'active' : ''}`}
            onClick={() => setActiveMode('text')}
          >
            <FileText size={14} />
            <span>Paste Notes</span>
          </button>
        </div>


        {activeMode === 'pdf' && (
          <div>
            <div 
              style={{
                border: '2px dashed var(--border-focus)',
                borderRadius: 'var(--r-lg)',
                padding: '44px 20px',
                textAlign: 'center',
                background: 'rgba(108, 92, 231, 0.04)',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileUpload}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              {isProcessingPdf ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <Loader2 size={36} color="var(--accent)" className="spin-anim" />
                  <p style={{ fontWeight: 600 }}>Extracting text & chunking sections...</p>
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
                      Supports text-based lecture slides, textbooks, and technical papers
                    </p>
                  </div>
                </div>
              )}
            </div>

            {pdfError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', color: 'var(--red)', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{pdfError}</span>
              </div>
            )}
          </div>
        )}

        {/* 3. Paste Notes */}
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
                <span>Open in Reading View</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
