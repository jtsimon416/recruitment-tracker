import React, { useEffect, useState } from 'react';
import { Trash2, CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react';
import '../styles/ConfirmationModal.css';

export default function ConfirmationModal({
  isOpen,
  type = 'info', // 'delete', 'success', 'warning', 'error', 'info'
  title,
  message,
  contextInfo, // Optional: Additional context to display
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) {
  const [buttonHovered, setButtonHovered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => (document.body.style.overflow = '');
  }, [isOpen]);

  if (!isOpen) return null;

  // Map action type to color scheme with inline styles
  const colorSchemes = {
    delete: {
      headerStyle: {
        backgroundImage: 'linear-gradient(to right, rgba(190, 24, 93, 0.4), rgba(190, 24, 93, 0.2))',
      },
      buttonStyle: {
        backgroundColor: 'rgba(244, 63, 94, 0.3)',
        color: 'rgb(251, 113, 133)',
        border: 'none',
      },
      buttonHoverStyle: {
        backgroundColor: 'rgba(244, 63, 94, 0.4)',
      },
      iconBgStyle: {
        backgroundColor: 'rgba(244, 63, 94, 0.2)',
      },
      iconColor: 'rgb(251, 113, 133)',
      contextStyle: {
        backgroundColor: 'rgba(190, 24, 93, 0.2)',
        borderLeft: '2px solid rgba(190, 24, 93, 0.5)',
        color: 'rgb(251, 113, 133)',
      },
      icon: Trash2
    },
    success: {
      headerStyle: {
        backgroundImage: 'linear-gradient(to right, rgba(16, 185, 129, 0.4), rgba(16, 185, 129, 0.2))',
      },
      buttonStyle: {
        backgroundColor: 'rgba(52, 211, 153, 0.3)',
        color: 'rgb(110, 231, 183)',
        border: 'none',
      },
      buttonHoverStyle: {
        backgroundColor: 'rgba(52, 211, 153, 0.4)',
      },
      iconBgStyle: {
        backgroundColor: 'rgba(52, 211, 153, 0.2)',
      },
      iconColor: 'rgb(52, 211, 153)',
      contextStyle: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderLeft: '2px solid rgba(16, 185, 129, 0.5)',
        color: 'rgb(110, 231, 183)',
      },
      icon: CheckCircle
    },
    warning: {
      headerStyle: {
        backgroundImage: 'linear-gradient(to right, rgba(217, 119, 6, 0.4), rgba(217, 119, 6, 0.2))',
      },
      buttonStyle: {
        backgroundColor: 'rgba(251, 191, 36, 0.3)',
        color: 'rgb(253, 224, 71)',
        border: 'none',
      },
      buttonHoverStyle: {
        backgroundColor: 'rgba(251, 191, 36, 0.4)',
      },
      iconBgStyle: {
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
      },
      iconColor: 'rgb(251, 191, 36)',
      contextStyle: {
        backgroundColor: 'rgba(217, 119, 6, 0.2)',
        borderLeft: '2px solid rgba(217, 119, 6, 0.5)',
        color: 'rgb(253, 224, 71)',
      },
      icon: AlertCircle
    },
    error: {
      headerStyle: {
        backgroundImage: 'linear-gradient(to right, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.2))',
      },
      buttonStyle: {
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        color: 'rgb(248, 113, 113)',
        border: 'none',
      },
      buttonHoverStyle: {
        backgroundColor: 'rgba(239, 68, 68, 0.4)',
      },
      iconBgStyle: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
      },
      iconColor: 'rgb(248, 113, 113)',
      contextStyle: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderLeft: '2px solid rgba(239, 68, 68, 0.5)',
        color: 'rgb(248, 113, 113)',
      },
      icon: XCircle
    },
    info: {
      headerStyle: {
        backgroundImage: 'linear-gradient(to right, rgba(8, 145, 178, 0.4), rgba(8, 145, 178, 0.2))',
      },
      buttonStyle: {
        backgroundColor: 'rgba(34, 211, 238, 0.3)',
        color: 'rgb(165, 243, 252)',
        border: 'none',
      },
      buttonHoverStyle: {
        backgroundColor: 'rgba(34, 211, 238, 0.4)',
      },
      iconBgStyle: {
        backgroundColor: 'rgba(34, 211, 238, 0.2)',
      },
      iconColor: 'rgb(34, 211, 238)',
      contextStyle: {
        backgroundColor: 'rgba(8, 145, 178, 0.2)',
        borderLeft: '2px solid rgba(8, 145, 178, 0.5)',
        color: 'rgb(165, 243, 252)',
      },
      icon: Info
    }
  };

  const scheme = colorSchemes[type] || colorSchemes.info;
  const IconComponent = scheme.icon;

  return (
    <div className="confirmation-modal-overlay" onClick={onCancel}>
      <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header with icon and gradient */}
        <div 
          className="confirmation-modal-header"
          style={{
            ...scheme.headerStyle,
            borderBottom: '1px solid rgb(51, 65, 85)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                padding: '8px',
                borderRadius: '6px',
                ...scheme.iconBgStyle,
              }}
            >
              <IconComponent size={20} style={{ color: scheme.iconColor }} />
            </div>
            <h2 style={{ color: 'rgb(226, 232, 240)', fontWeight: '600', fontSize: '18px' }}>
              {title}
            </h2>
          </div>
        </div>

        {/* Main message */}
        <div className="confirmation-modal-body" style={{ padding: '20px', minHeight: '60px' }}>
          <p style={{ color: 'rgb(203, 213, 225)', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
            {message}
          </p>

          {/* Optional context info */}
          {contextInfo && (
            <div
              style={{
                padding: '12px',
                borderRadius: '6px',
                fontSize: '12px',
                ...scheme.contextStyle,
              }}
            >
              <strong>Info:</strong> {contextInfo}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div
          className="confirmation-modal-footer"
          style={{
            padding: '16px 20px',
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            borderTop: '1px solid rgb(51, 65, 85)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            style={{
              color: 'rgb(203, 213, 225)',
              backgroundColor: 'transparent',
              border: '1px solid rgb(71, 85, 105)',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgb(51, 65, 85)')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            style={{
              ...scheme.buttonStyle,
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              ...( buttonHovered ? scheme.buttonHoverStyle : {} )
            }}
            onMouseEnter={(e) => {
              setButtonHovered(true);
              Object.assign(e.target.style, scheme.buttonHoverStyle);
            }}
            onMouseLeave={(e) => {
              setButtonHovered(false);
              Object.assign(e.target.style, scheme.buttonStyle);
            }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}