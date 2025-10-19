import React, { useState, useEffect } from 'react';
import * as mammoth from 'mammoth';
import { X } from 'lucide-react';

function WordDocViewerModal({ isOpen, onClose, resumeUrl, candidateName }) {
  const [wordDocHtml, setWordDocHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && resumeUrl && resumeUrl.includes('.docx')) {
      convertWordToHtml(resumeUrl);
    } else {
      setWordDocHtml('');
      setLoading(true);
      setError('');
    }
  }, [isOpen, resumeUrl]);

  const convertWordToHtml = async (url) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setWordDocHtml(result.value);
      setLoading(false);
    } catch (err) {
      console.error('Error converting Word document:', err);
      setError('Unable to display document. Please download to view.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="word-doc-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
    >
      <div 
        className="word-doc-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1F2335',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '900px',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 50px rgba(0, 0, 0, 0.5)',
          border: '1px solid #414868'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '20px',
            borderBottom: '1px solid #414868',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#24283B'
          }}
        >
          <div>
            <h2 style={{ 
              margin: 0, 
              color: '#C0CAF5', 
              fontSize: '20px',
              fontWeight: '600'
            }}>
              Resume: {candidateName || 'Candidate'}
            </h2>
            <p style={{ 
              margin: '5px 0 0 0', 
              color: '#565F89', 
              fontSize: '13px' 
            }}>
              Microsoft Word Document
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(247, 118, 142, 0.1)'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
            title="Close"
          >
            <X size={24} color="#F7768E" />
          </button>
        </div>

        {/* Document Content */}
        <div 
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '30px',
            backgroundColor: '#1A1B26'
          }}
        >
          {loading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#A9B1D6'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #414868',
                borderTop: '3px solid #BB9AF7',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ marginTop: '20px', fontSize: '14px' }}>Loading document...</p>
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#F7768E',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '16px', marginBottom: '15px' }}>{error}</p>
              <a 
                href={resumeUrl} 
                download
                style={{
                  color: '#BB9AF7',
                  textDecoration: 'none',
                  padding: '10px 20px',
                  border: '1px solid #BB9AF7',
                  borderRadius: '6px',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#BB9AF7';
                  e.target.style.color = '#1A1B26';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#BB9AF7';
                }}
              >
                Download Document
              </a>
            </div>
          )}

          {!loading && !error && wordDocHtml && (
            <div 
              dangerouslySetInnerHTML={{ __html: wordDocHtml }}
              style={{
                color: '#C0CAF5',
                lineHeight: '1.8',
                fontSize: '15px',
                fontFamily: 'Georgia, "Times New Roman", serif'
              }}
              className="word-doc-content"
            />
          )}
        </div>

        {/* Footer with Download Button */}
        {!loading && !error && (
          <div 
            style={{
              padding: '15px 20px',
              borderTop: '1px solid #414868',
              backgroundColor: '#24283B',
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          >
            <a 
              href={resumeUrl} 
              download
              style={{
                color: '#BB9AF7',
                textDecoration: 'none',
                padding: '10px 20px',
                border: '1px solid #BB9AF7',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'inline-block'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#BB9AF7';
                e.target.style.color = '#1A1B26';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#BB9AF7';
              }}
            >
              Download Original
            </a>
          </div>
        )}
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .word-doc-content p {
          margin-bottom: 12px;
        }

        .word-doc-content h1, 
        .word-doc-content h2, 
        .word-doc-content h3 {
          color: #7AA2F7;
          margin-top: 20px;
          margin-bottom: 10px;
        }

        .word-doc-content ul, 
        .word-doc-content ol {
          margin-left: 20px;
          margin-bottom: 12px;
        }

        .word-doc-content li {
          margin-bottom: 6px;
        }

        .word-doc-content strong {
          color: #BB9AF7;
          font-weight: 600;
        }

        .word-doc-content a {
          color: #7AA2F7;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export default WordDocViewerModal;