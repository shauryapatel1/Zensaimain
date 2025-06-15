import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

/**
 * Renders a circular logo image with optional animation and configurable size.
 *
 * @param size - Determines the logo's size; accepts 'sm', 'md', or 'lg'. Defaults to 'md'.
 * @param className - Additional CSS classes to apply to the container.
 * @param animate - If true, enables entrance and hover animations. Defaults to true.
 *
 * @returns A JSX element displaying the logo, animated if {@link animate} is true.
 */
export default function Logo({ size = 'md', className = '', animate = true }: LogoProps) {
  // Size classes for the container
  const logoContainerSizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  if (animate) {
    return (
      <motion.div
        className={`flex-shrink-0 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm shadow-lg ${logoContainerSizeClasses[size]} ${className}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
      >
        <img 
          src="/Zensai Logo copy.png" 
          alt="Zeno the fox" 
          className="w-full h-full object-cover object-center"
        />
      </motion.div>
    );
  }

  return (
    <div className={`flex-shrink-0 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm shadow-lg ${logoContainerSizeClasses[size]} ${className}`}>
      <img 
        src="/Zensai Logo copy.png" 
        alt="Zeno the fox" 
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
}