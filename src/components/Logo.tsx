import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

export default function Logo({ size = 'md', className = '', animate = true }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const LogoImage = (
    <img
      src="/Zensai Logo.png"
      alt="Zensai Logo"
      className={`${sizeClasses[size]} object-contain ${className}`}
    />
  );

  if (animate) {
    return (
      <motion.div
        className="flex-shrink-0"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
      >
        {LogoImage}
      </motion.div>
    );
  }

  return <div className="flex-shrink-0">{LogoImage}</div>;
}