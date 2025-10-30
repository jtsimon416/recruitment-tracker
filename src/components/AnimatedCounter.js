import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const AnimatedCounter = ({ end, duration = 1500, suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('🔢 AnimatedCounter received value:', end);
    const numericValue = typeof end === 'number' ? end : parseFloat(end) || 0;
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
  }, [end, duration]);

  const displayValue = typeof end === 'number' && end % 1 !== 0
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
