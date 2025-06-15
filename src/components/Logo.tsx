import React from 'react';
import { motion } from 'framer-motion';
import LottieAvatar from './LottieAvatar';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

export default function Logo({ size = 'md', className = '', animate = true }: LogoProps) {
  // Size classes for the container (smaller than the avatar to create cropping effect)
  const logoContainerSizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };
  
  // Position the avatar to show only Zeno's head
  const lottiePositioning = {
    sm: '-top-6 -left-6',
    md: '-top-8 -left-9',
    lg: '-top-10 -left-12'
  };

  if (animate) {
    return (
      <motion.div
        className={`flex-shrink-0 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm shadow-lg relative ${logoContainerSizeClasses[size]} ${className}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
      >
        <LottieAvatar 
          mood={4} 
          size="lg"
          variant="greeting" 
          animate={false}
          className={`absolute ${lottiePositioning[size]}`}
        />
      </motion.div>
    );
  }

  return (
    <div className={`flex-shrink-0 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm shadow-lg relative ${logoContainerSizeClasses[size]} ${className}`}>
      <LottieAvatar 
        mood={4} 
        size="lg"
        variant="greeting" 
        animate={false}
        className={`absolute ${lottiePositioning[size]}`}
      />
    </div>
  );
}