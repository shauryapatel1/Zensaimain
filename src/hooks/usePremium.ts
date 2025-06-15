import { useState, useCallback } from 'react';
import { useJournal } from './useJournal';

export function usePremium() {
  const { profile } = useJournal();
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
  const [featureName, setFeatureName] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');

  // Check if user has premium subscription
  const isPremium = profile?.subscription_status === 'premium';
  
  // Check if user has premium plus (yearly) subscription
  const isPremiumPlus = isPremium && profile?.subscription_tier === 'premium_plus';

  // Function to show upsell modal
  const showUpsellModal = useCallback((name: string, description: string) => {
    setFeatureName(name);
    setFeatureDescription(description);
    setIsUpsellModalOpen(true);
  }, []);

  // Function to hide upsell modal
  const hideUpsellModal = useCallback(() => {
    setIsUpsellModalOpen(false);
  }, []);

  // Daily usage limits for free users
  const getDailyUsageLimit = (featureType: string): number => {
    switch (featureType) {
      case 'prompt':
        return 2;
      case 'mood-analysis':
        return 2;
      case 'affirmation':
        return 2;
      case 'mood-quote':
        return 2;
      default:
        return 1;
    }
  };

  // Check if user has reached daily limit for a feature
  const hasReachedDailyLimit = (featureType: string): boolean => {
    if (isPremium) return false;
    
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `zensai-${featureType}-usage-${today}`;
    const currentUsage = parseInt(localStorage.getItem(storageKey) || '0', 10);
    
    return currentUsage >= getDailyUsageLimit(featureType);
  };

  // Increment usage counter for a feature
  const incrementUsageCounter = (featureType: string): void => {
    if (isPremium) return;
    
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `zensai-${featureType}-usage-${today}`;
    const currentUsage = parseInt(localStorage.getItem(storageKey) || '0', 10);
    
    localStorage.setItem(storageKey, (currentUsage + 1).toString());
  };

  // Get remaining uses for a feature
  const getRemainingUses = (featureType: string): number => {
    if (isPremium) return Infinity;
    
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `zensai-${featureType}-usage-${today}`;
    const currentUsage = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const limit = getDailyUsageLimit(featureType);
    
    return Math.max(0, limit - currentUsage);
  };

  return {
    isPremium,
    isPremiumPlus,
    isUpsellModalOpen,
    featureName,
    featureDescription,
    showUpsellModal,
    hideUpsellModal,
    hasReachedDailyLimit,
    incrementUsageCounter,
    getRemainingUses
  };
}