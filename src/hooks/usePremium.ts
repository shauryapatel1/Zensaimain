import { useState, useCallback } from 'react';
import { useJournal } from './useJournal';

export interface UpsellModalContent {
  featureName: string;
  featureDescription: string;
}

/**
 * Provides premium subscription state, feature access control, and upsell modal management for the application.
 *
 * Returns subscription status flags, subscription expiration date, upsell modal state and controls, and functions to check feature access and enforce daily usage limits for free users.
 *
 * @returns An object containing:
 * - `isPremium`: Whether the user has a premium subscription.
 * - `isPremiumPlus`: Whether the user has a premium plus (yearly) subscription.
 * - `subscriptionExpiresAt`: The subscription expiration date, or `null` if not available.
 * - `isUpsellModalOpen`: Whether the upsell modal is currently open.
 * - `upsellContent`: The current content of the upsell modal.
 * - `showUpsellModal(content?)`: Opens the upsell modal with optional custom content.
 * - `hideUpsellModal()`: Closes the upsell modal.
 * - `canUseFeature(featureName)`: Returns `true` if the specified feature is accessible to the user.
 * - `trackFeatureUsage(featureKey, limit?)`: Tracks daily usage of a feature for free users, enforcing a usage limit (default 2); always returns `true` for premium users.
 */
export function usePremium() {
  const { profile } = useJournal();
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
  const [upsellContent, setUpsellContent] = useState<UpsellModalContent>({
    featureName: 'Premium Feature',
    featureDescription: 'Upgrade to Zensai Premium to unlock this feature and many more!'
  });

  // Check if user has premium subscription
  const isPremium = profile?.subscription_status === 'premium';
  
  // Check if user has premium plus (yearly) subscription
  const isPremiumPlus = isPremium && profile?.subscription_tier === 'premium_plus';
  
  // Get subscription expiry date if available
  const subscriptionExpiresAt = profile?.subscription_expires_at 
    ? new Date(profile.subscription_expires_at) 
    : null;

  // Show upsell modal with custom content
  const showUpsellModal = useCallback((content: Partial<UpsellModalContent> = {}) => {
    setUpsellContent(prev => ({
      ...prev,
      ...content
    }));
    setIsUpsellModalOpen(true);
  }, []);

  // Hide upsell modal
  const hideUpsellModal = useCallback(() => {
    setIsUpsellModalOpen(false);
  }, []);

  // Check if a feature is available based on subscription status
  const canUseFeature = useCallback((featureName: string): boolean => {
    // Free features available to everyone
    const freeFeatures = [
      'basic-journaling',
      'mood-tracking',
      'basic-ai-insights',
      'streak-tracking',
      'common-badges'
    ];

    if (freeFeatures.includes(featureName)) {
      return true;
    }

    // Premium features require subscription
    return isPremium;
  }, [isPremium]);

  // Track feature usage for free users (for daily limits)
  const trackFeatureUsage = useCallback((featureKey: string, limit: number = 2): boolean => {
    if (isPremium) return true; // Premium users have unlimited usage
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const storageKey = `zensai-feature-${featureKey}-${today}`;
    
    // Get current usage
    const currentUsage = parseInt(localStorage.getItem(storageKey) || '0', 10);
    
    // Check if limit reached
    if (currentUsage >= limit) {
      return false;
    }
    
    // Increment usage
    localStorage.setItem(storageKey, (currentUsage + 1).toString());
    return true;
  }, [isPremium]);

  return {
    isPremium,
    isPremiumPlus,
    subscriptionExpiresAt,
    isUpsellModalOpen,
    upsellContent,
    showUpsellModal,
    hideUpsellModal,
    canUseFeature,
    trackFeatureUsage
  };
}