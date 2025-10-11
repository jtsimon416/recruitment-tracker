import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

/**
 * PageTransition Component
 * Provides smooth fade transitions between pages and prevents flash of empty state
 *
 * Usage:
 * <PageTransition isLoading={loading}>
 *   <YourPageContent />
 * </PageTransition>
 */
const PageTransition = ({ children, isLoading = false }) => {
  const location = useLocation();

  const pageVariants = {
    initial: {
      opacity: 0,
      y: 10
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="page-transition-wrapper"
      >
        {/* Loading overlay */}
        {isLoading && (
          <motion.div
            className="page-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="loading-spinner-wrapper">
              <div className="loading-spinner" />
              <p className="loading-text">Loading...</p>
            </div>
          </motion.div>
        )}

        {/* Page content - fade out while loading */}
        <motion.div
          className="page-content-wrapper"
          animate={{
            opacity: isLoading ? 0.3 : 1,
            filter: isLoading ? 'blur(4px)' : 'blur(0px)'
          }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
