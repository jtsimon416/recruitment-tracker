import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './SplashScreen.css';

const SplashScreen = ({ children }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Show splash for 2.6 seconds total (0.6s fade in + 1.4s hold + 0.6s fade out)
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2600);

    // Show content slightly before splash disappears for smooth transition
    const contentTimer = setTimeout(() => {
      setShowContent(true);
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(contentTimer);
    };
  }, []);

  const splashVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease: 'easeOut' }
    },
    exit: {
      opacity: 0,
      scale: 1.1,
      transition: { duration: 0.6, ease: 'easeIn' }
    }
  };

  const glowVariants = {
    initial: { opacity: 0.5 },
    animate: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            className="splash-screen"
            variants={splashVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="splash-content">
              <motion.h1
                className="splash-logo"
                variants={glowVariants}
                initial="initial"
                animate="animate"
              >
                HIRE LOGIC
              </motion.h1>
              <motion.div
                className="splash-tagline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Recruitment Excellence
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showContent && children}
    </>
  );
};

export default SplashScreen;
