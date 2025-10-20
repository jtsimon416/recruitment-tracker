import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import mammoth from 'mammoth';
import { X, AlertCircle } from 'lucide-react';
import '../styles/DocumentViewerModal.css';

/**
 * DocumentViewerModal Component
 *
 * A reusable modal for viewing .docx documents using mammoth.js
 * Converts Word documents to HTML and displays them in a styled modal
 *
 * Props:
 * - documentUrl: URL of the .docx file to display
 * - documentTitle: Optional title to show in the header
 * - onClose: Function to call when modal is closed
 * - onViewed: Optional function to call when document is successfully loaded (for tracking views)
 */
const DocumentViewerModal = ({ documentUrl, documentTitle, onClose, onViewed }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📄 Loading document from:', documentUrl);

        // Fetch the document
        const response = await fetch(documentUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log('📥 Document downloaded, size:', arrayBuffer.byteLength, 'bytes');

        // Convert .docx to HTML using mammoth
        const result = await mammoth.convertToHtml({ arrayBuffer });
        console.log('✅ Document converted to HTML successfully');

        if (result.messages && result.messages.length > 0) {
          console.log('⚠️ Conversion warnings:', result.messages);
        }

        setHtmlContent(result.value);

        // Mark as viewed (e.g., for recruiters viewing role instructions)
        if (onViewed) {
          console.log('👁️ Marking document as viewed');
          await onViewed();
        }
      } catch (err) {
        console.error('❌ Error loading document:', err);
        setError(err.message || 'Failed to load document. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (documentUrl) {
      loadDocument();
    }
  }, [documentUrl, onViewed]);

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <motion.div
      className="document-viewer-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="document-viewer-modal"
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="document-viewer-header">
          <h2>📄 {documentTitle || 'Document Viewer'}</h2>
          <button
            className="btn-close-viewer"
            onClick={onClose}
            title="Close (ESC)"
          >
            <X size={24} />
          </button>
        </div>

        <div className="document-viewer-body">
          {loading && (
            <div className="document-viewer-loading">
              <div className="loading-spinner"></div>
              <p>Loading document...</p>
              <p className="loading-subtext">Converting Word document to HTML</p>
            </div>
          )}

          {error && (
            <div className="document-viewer-error">
              <AlertCircle size={48} />
              <p className="error-message">{error}</p>
              <button className="btn-retry" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && htmlContent && (
            <div
              className="document-viewer-content"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}

          {!loading && !error && !htmlContent && (
            <div className="document-viewer-error">
              <AlertCircle size={48} />
              <p className="error-message">Document appears to be empty</p>
            </div>
          )}
        </div>

        <div className="document-viewer-footer">
          <button className="btn-close-doc" onClick={onClose}>
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DocumentViewerModal;
