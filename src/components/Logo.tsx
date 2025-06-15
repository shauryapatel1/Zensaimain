import React from 'react';
import { motion } from 'framer-motion';
import LottieAvatar from './LottieAvatar';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

export default function Logo({ size = 'md', className = '', animate = true }: LogoProps) {
  const sizeMap = {
    sm: 'sm',
    md: 'md',
    lg: 'lg'
  };

  if (animate) {
    return (
      <motion.div
        className={`flex-shrink-0 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm shadow-lg ${className}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
      >
        <LottieAvatar 
          mood={4} 
          size={sizeMap[size]} 
          variant="greeting" 
          animate={false}
        />
      </motion.div>
    );
  }

  return (
    <div className={`flex-shrink-0 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm shadow-lg ${className}`}>
      <LottieAvatar 
        mood={4} 
        size={sizeMap[size]} 
        variant="greeting" 
        animate={false}
      />
    </div>
  );
}