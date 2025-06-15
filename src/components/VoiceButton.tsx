import React from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

interface VoiceButtonProps {
  isPremiumUser?: boolean;
  onUpsellTrigger?: () => void;
  isGenerating: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Renders a customizable button for controlling voice playback with premium feature gating and visual feedback.
 *
 * The button displays different icons and tooltips based on playback and generation state. If the user is not premium, clicking the button triggers an upsell flow if provided, or disables the button otherwise. When playing, an animated pulse effect is shown behind the button.
 *
 * @param isPremiumUser - Whether the user has premium access. Defaults to true.
 * @param onUpsellTrigger - Callback to trigger an upsell flow for non-premium users.
 * @param isGenerating - Indicates if speech generation is in progress.
 * @param isPlaying - Indicates if speech is currently playing.
 * @param onPlay - Callback to start playback.
 * @param onStop - Callback to stop playback.
 * @param disabled - Disables the button if true.
 * @param size - Controls button size; accepts 'sm', 'md', or 'lg'. Defaults to 'md'.
 * @param className - Additional CSS classes for the button.
 *
 * @returns A React button element with dynamic icon, tooltip, and animation based on playback and premium status.
 *
 * @remark If the user is not premium and no upsell trigger is provided, the button is disabled.
 */
export default function VoiceButton({
  isPremiumUser = true,
  onUpsellTrigger,
  isGenerating,
  isPlaying,
  onPlay,
  onStop,
  disabled = false,
  size = 'md',
  className = ''
}: VoiceButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleClick = () => {
    if (!isPremiumUser) {
      if (onUpsellTrigger) onUpsellTrigger();
      return;
    }
    
    if (isPlaying) {
      onStop();
    } else {
      onPlay();
    }
  };

  const getIcon = () => {
    if (isGenerating) {
      return <Loader2 className={`${iconSizes[size]} animate-spin`} />;
    }
    if (isPlaying) {
      return <VolumeX className={iconSizes[size]} />;
    }
    return <Volume2 className={iconSizes[size]} />;
  };

  const getTooltip = () => {
    if (!isPremiumUser) return 'Premium feature - Upgrade to unlock';
    if (isGenerating) return 'Generating speech...';
    if (isPlaying) return 'Stop speech';
    return 'Play speech';
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={(!isPremiumUser && !onUpsellTrigger) || disabled || isGenerating}
      className={`
        ${sizeClasses[size]}
        ${isPremiumUser ? 'bg-zen-peach-400 hover:bg-zen-peach-500' : 'bg-gray-400 hover:bg-gray-500'} 
        text-white rounded-full 
        transition-all duration-300 
        shadow-lg hover:shadow-xl
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center
        ${className}
      `}
      whileHover={!disabled && !isGenerating && (isPremiumUser || onUpsellTrigger) ? { scale: 1.1 } : {}}
      whileTap={!disabled && !isGenerating && (isPremiumUser || onUpsellTrigger) ? { scale: 0.95 } : {}}
      title={getTooltip()}
      aria-label={getTooltip()}
    >
      {getIcon()}
      
      {/* Pulse effect when playing */}
      {isPlaying && (
        <motion.div
          className="absolute inset-0 bg-zen-peach-400 rounded-full"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 0, 0.7]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.button>
  );
}