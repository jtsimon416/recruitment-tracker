import React, { createContext, useContext, useState } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

const ConfirmationContext = createContext();

export function ConfirmationProvider({ children }) {
  const [state, setState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    contextInfo: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    onCancel: null
  });

  const showConfirmation = (config) => {
    setState({
      isOpen: true,
      type: config.type || 'info',
      title: config.title,
      message: config.message,
      contextInfo: config.contextInfo || null,
      confirmText: config.confirmText || 'Confirm',
      cancelText: config.cancelText || 'Cancel',
      onConfirm: config.onConfirm,
      onCancel: config.onCancel
    });
  };

  const closeConfirmation = () => {
    setState(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (state.onConfirm) state.onConfirm();
    closeConfirmation();
  };

  const handleCancel = () => {
    if (state.onCancel) state.onCancel();
    closeConfirmation();
  };

  return (
    <ConfirmationContext.Provider value={{ showConfirmation, closeConfirmation }}>
      {children}
      <ConfirmationModal
        isOpen={state.isOpen}
        type={state.type}
        title={state.title}
        message={state.message}
        contextInfo={state.contextInfo}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
      />
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within ConfirmationProvider');
  }
  return context;
}
