import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

/**
 * Renders a circular logo container with optional animation and customizable size.
 *
 * Displays the Zensai logo inside a styled, blurred, and shadowed container. The container's size and additional CSS classes can be customized. When animation is enabled, the logo fades and scales in on mount and slightly enlarges on hover.
 *
 * @param size - Determines the logo container's size; can be 'sm', 'md', or 'lg'. Defaults to 'md'.
 * @param className - Additional CSS classes to apply to the container.
 * @param animate - If true, enables mount and hover animations. Defaults to true.
 *
 * @returns The rendered logo component as a JSX element.
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