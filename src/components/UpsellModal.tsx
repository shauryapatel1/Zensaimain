import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription: string;
}

export default function UpsellModal({ 
  isOpen, 
  onClose, 
  featureName, 
  featureDescription 
}: UpsellModalProps) {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    onClose();
    navigate('/premium');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2">
                <div className="bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white p-2 rounded-full">
                  <Crown className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200">
                  Premium Feature
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-zen-sage-400 dark:text-gray-500 hover:text-zen-sage-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                {featureName}
              </h4>
              <p className="text-zen-sage-600 dark:text-gray-400">
                {featureDescription}
              </p>
            </div>
            
            <div className="bg-zen-mint-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
              <h5 className="font-medium text-zen-sage-800 dark:text-gray-200 mb-2">
                With Zensai Premium, you'll get:
              </h5>
              <ul className="space-y-2 text-zen-sage-600 dark:text-gray-400">
                <li className="flex items-start space-x-2">
                  <span className="text-zen-mint-500 mt-1">•</span>
                  <span>Unlimited access to all premium features</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-zen-mint-500 mt-1">•</span>
                  <span>Photo attachments for your journal entries</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-zen-mint-500 mt-1">•</span>
                  <span>Voice synthesis for affirmations</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-zen-mint-500 mt-1">•</span>
                  <span>Full journal history access</span>
                </li>
              </ul>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-700 dark:text-gray-300 rounded-xl hover:bg-zen-sage-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Maybe Later
              </button>
              <button
                onClick={handleUpgradeClick}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <span>Upgrade Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}