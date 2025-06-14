import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, Trophy } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'badge';

interface ToastNotificationProps {
  isVisible: boolean;
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
  badge?: {
    icon: string;
    name: string;
    rarity: string;
  };
}

export default function ToastNotification({
  isVisible,
  message,
  type,
  onClose,
  duration = 5000,
  badge
}: ToastNotificationProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'badge':
        return <Trophy className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'from-zen-mint-400 to-zen-mint-500 border-zen-mint-300';
      case 'error':
        return 'from-red-400 to-red-500 border-red-300';
      case 'info':
        return 'from-blue-400 to-blue-500 border-blue-300';
      case 'badge':
        if (badge?.rarity === 'legendary') {
          return 'from-yellow-400 to-yellow-500 border-yellow-300';
        } else if (badge?.rarity === 'epic') {
          return 'from-purple-400 to-purple-500 border-purple-300';
        } else if (badge?.rarity === 'rare') {
          return 'from-blue-400 to-blue-500 border-blue-300';
        }
        return 'from-zen-peach-400 to-zen-peach-500 border-zen-peach-300';
      default:
        return 'from-gray-400 to-gray-500 border-gray-300';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed top-4 right-4 bg-gradient-to-r ${getColors()} text-white px-6 py-4 rounded-2xl shadow-xl z-50 border max-w-sm`}
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.4 
          }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-start space-x-3">
            {type === 'badge' && badge ? (
              <div className="flex-shrink-0 text-2xl">{badge.icon}</div>
            ) : (
              <div className="flex-shrink-0">{getIcon()}</div>
            )}
            
            <div className="flex-1 min-w-0">
              {type === 'badge' && badge && (
                <div className="font-bold text-sm mb-1">
                  🎉 Badge Earned!
                </div>
              )}
              <p className="font-medium text-sm leading-relaxed">
                {message}
              </p>
              {type === 'badge' && badge && (
                <div className="text-xs opacity-90 mt-1 capitalize">
                  {badge.rarity} • {badge.name}
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="flex-shrink-0 text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Progress bar for duration */}
          {duration > 0 && (
            <motion.div
              className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-2xl"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: duration / 1000, ease: "linear" }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}