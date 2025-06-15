import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription: string;
}

/**
 * Displays a modal dialog promoting an upgrade to a premium subscription, highlighting a specific feature and listing additional premium benefits.
 *
 * The modal animates in and out, overlays the viewport, and provides actions to upgrade or dismiss. Selecting "Upgrade to Premium" closes the modal and navigates to the premium subscription page.
 *
 * @param isOpen - Whether the modal is visible.
 * @param onClose - Callback to close the modal.
 * @param featureName - Name of the promoted feature.
 * @param featureDescription - Description of the promoted feature.
 */
export default function UpsellModal({ 
  isOpen, 
  onClose, 
  featureName, 
  featureDescription 
}: UpsellModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/premium');
  };

  const premiumFeatures = [
    'Unlimited journal entries with photos',
    'Unlimited AI mood analysis & affirmations',
    'Voice synthesis for all affirmations',
    'Full journal history access',
    'Premium badges collection'
  ];

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
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-zen-mint-400 to-zen-peach-400 rounded-full flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200">
                  Upgrade to Premium
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-zen-sage-400 dark:text-gray-500 hover:text-zen-sage-600 dark:hover:text-gray-300 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Feature Info */}
            <div className="mb-6">
              <div className="bg-zen-mint-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
                <h4 className="font-medium text-zen-sage-800 dark:text-gray-200 mb-1 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-zen-mint-500" />
                  {featureName}
                </h4>
                <p className="text-zen-sage-600 dark:text-gray-400 text-sm">
                  {featureDescription}
                </p>
              </div>
              
              <p className="text-zen-sage-700 dark:text-gray-300 mb-4">
                Unlock this feature and many more with Zensai Premium:
              </p>
              
              <ul className="space-y-2 mb-6">
                {premiumFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-zen-mint-500 mt-1 flex-shrink-0" />
                    <span className="text-zen-sage-700 dark:text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleUpgrade}
                className="w-full py-3 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white font-medium rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <Crown className="w-4 h-4" />
                <span>Upgrade to Premium</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-3 bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-700 dark:text-gray-300 font-medium rounded-xl hover:bg-zen-sage-200 dark:hover:bg-gray-600 transition-all duration-300"
              >
                Maybe Later
              </button>
            </div>
            
            {/* Free Trial Note */}
            <p className="text-center text-zen-sage-500 dark:text-gray-400 text-xs mt-4">
              Includes 7-day free trial. Cancel anytime.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}