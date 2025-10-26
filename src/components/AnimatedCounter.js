import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const AnimatedCounter = ({ value, duration = 1.5, suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    let startTime = null;
    const startValue = 0;
    const endValue = numericValue;
    const totalDuration = duration * 1000;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = startValue + (endValue - startValue) * easeOutQuart;

      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const displayValue = typeof value === 'number' && value % 1 !== 0
    ? count.toFixed(1)
    : Math.round(count);

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {displayValue}{suffix}
    </motion.span>
  );
};

export default AnimatedCounter;
