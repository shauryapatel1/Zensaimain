import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from './usePremium';
import { MoodLevel } from '../types';

interface MoodQuoteResponse {
  success: boolean;
  quote: string;
  attribution?: string;
  generated_by: 'ai' | 'fallback';
  error?: string;
  timestamp: string;
}

/**
 * React hook that provides functionality to generate mood-based quotes using a Supabase edge function, with integrated premium usage tracking and error handling.
 *
 * Exposes a function to generate a quote based on the user's mood, an optional journal entry, and previous quotes. Enforces daily usage limits for non-premium users and provides error state and loading status.
 *
 * @returns An object containing:
 * - `generateMoodQuote`: Function to request a mood-based quote.
 * - `isGenerating`: Boolean indicating if a quote is currently being generated.
 * - `error`: Error message string or `null` if no error.
 * - `dailyUsageCount`: Number of times the feature has been used today (not updated within this hook).
 *
 * @remark If the user is not premium and exceeds the daily usage limit, quote generation is blocked and an error message is set.
 */
export function useMoodQuoteGenerator() {
  const { user } = useAuth();
  const { isPremium, trackFeatureUsage } = usePremium();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyUsageCount, setDailyUsageCount] = useState(0);

  const generateMoodQuote = async (
    mood: MoodLevel,
    journalEntry?: string,
    previousQuotes?: string[]
  ): Promise<{ quote: string; attribution?: string } | null> => {
    setIsGenerating(true);
    setError(null);
    
    // Check if free user has reached daily limit
    if (!isPremium && !trackFeatureUsage('mood-quote-generator')) {
      setError('Daily limit reached. Upgrade to Premium for unlimited mood quotes.');
      setIsGenerating(false);
      return null;
    }

    try {
      // Convert mood level to string
      const moodString = getMoodString(mood);

      const { data, error: functionError } = await supabase.functions.invoke('generate-mood-quote', {
        body: {
          mood: moodString,
          entry: journalEntry,
          name: user?.name,
          previousQuotes: previousQuotes || []
        }
      });

      if (functionError) {
        console.error('Edge function error:', functionError);
        setError('Failed to generate mood quote');
        return null;
      }

      const response: MoodQuoteResponse = data;
      
      if (!response.success) {
        setError(response.error || 'Failed to generate mood quote');
        // Return the fallback quote even if marked as unsuccessful
        return {
          quote: response.quote,
          attribution: response.attribution
        };
      }

      return {
        quote: response.quote,
        attribution: response.attribution
      };
    } catch (err) {
      console.error('Error calling mood quote generator:', err);
      setError('An unexpected error occurred during quote generation');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateMoodQuote,
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