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

export function useAffirmationGenerator() {
  const { user } = useAuth();
  const { isPremium, hasReachedDailyLimit, incrementUsageCounter } = usePremium();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAffirmation = async (
    journalEntry: string, 
    mood: MoodLevel
  ): Promise<string | null> => {
    if (!journalEntry.trim()) {
      setError('Journal entry is required for affirmation generation');
      return null;
    }
    
    // Check if user has reached daily limit for affirmations
    if (!isPremium && hasReachedDailyLimit('affirmation')) {
      setError('You\'ve reached your daily limit for AI affirmations. Upgrade to Premium for unlimited affirmations!');
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Increment usage counter for free users
      if (!isPremium) {
        incrementUsageCounter('affirmation');
      }
      
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
    error
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