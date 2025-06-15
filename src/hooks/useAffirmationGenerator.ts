import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from './usePremium';
import { MoodLevel } from '../types';

interface AffirmationResponse {
  success: boolean;
  affirmation: string;
  generated_by: 'ai' | 'fallback';
  error?: string;
  timestamp: string;
}

/**
 * React hook for generating affirmations based on a user's journal entry and mood.
 *
 * Provides an asynchronous function to request an affirmation, along with loading, error, and daily usage state. Enforces daily usage limits for non-premium users.
 *
 * @returns An object containing:
 * - `generateAffirmation`: Function to generate an affirmation from a journal entry and mood.
 * - `isGenerating`: Whether an affirmation is currently being generated.
 * - `error`: Error message if generation fails, or `null`.
 * - `dailyUsageCount`: Number of times the affirmation generator has been used today.
 *
 * @remark Non-premium users are subject to a daily usage limit for affirmation generation.
 */
export function useAffirmationGenerator() {
  const { user } = useAuth();
  const { isPremium, trackFeatureUsage } = usePremium();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyUsageCount, setDailyUsageCount] = useState(0);

  const generateAffirmation = async (
    journalEntry: string, 
    mood: MoodLevel
  ): Promise<string | null> => {
    if (!journalEntry.trim()) {
      setError('Journal entry is required for affirmation generation');
      return null;
    }

    setIsGenerating(true);
    setError(null);

    // Check if free user has reached daily limit
    if (!isPremium && !trackFeatureUsage('affirmation-generator')) {
      setError('Daily limit reached. Upgrade to Premium for unlimited affirmations.');
      setIsGenerating(false);
      return null;
    }

    try {
      // Convert mood level to string
      const moodString = getMoodString(mood);

      const { data, error: functionError } = await supabase.functions.invoke('generate-affirmation', {
        body: {
          entry: journalEntry.trim(),
          mood: moodString,
          name: user?.name
        }
      });

      if (functionError) {
        console.error('Edge function error:', functionError);
        setError('Failed to generate affirmation');
        return null;
      }

      const response: AffirmationResponse = data;
      
      if (!response.success) {
        setError(response.error || 'Failed to generate affirmation');
        // Return the fallback affirmation even if marked as unsuccessful
        return response.affirmation || null;
      }

      return response.affirmation;
    } catch (err) {
      console.error('Error calling affirmation generator:', err);
      setError('An unexpected error occurred during affirmation generation');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateAffirmation,
    isGenerating,
    error,
    dailyUsageCount
  };
}

// Helper function to convert mood level to descriptive string
function getMoodString(mood: MoodLevel): string {
  switch (mood) {
    case 1:
      return 'struggling';
    case 2:
      return 'low';
    case 3:
      return 'neutral';
    case 4:
      return 'good';
    case 5:
      return 'amazing';
    default:
      return 'neutral';
  }
}