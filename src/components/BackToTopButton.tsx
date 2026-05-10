import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import './skeleton.css';

export interface BackToTopButtonProps {
  threshold?: number;
  tooltip?: string;
}

const BackToTopButton: React.FC<BackToTopButtonProps> = ({
  threshold = 200,
  tooltip = '回到顶部',
}) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const goTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const visible = scrollY > threshold;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="btn back-to-top"
          onClick={goTop}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <ArrowUp className="btn-icon" width={20} height={20} />
          <div className="tooltip">{tooltip}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BackToTopButton;
