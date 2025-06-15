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
 * React hook for generating mood-based quotes using a Supabase edge function.
 *
 * Provides a function to generate a quote tailored to a user's mood, with optional context from a journal entry and previous quotes. Enforces daily usage limits for non-premium users.
 *
 * @returns An object containing:
 * - `generateMoodQuote`: Asynchronously generates a mood-based quote.
 * - `isGenerating`: Indicates if a quote is currently being generated.
 * - `error`: Error message if quote generation fails, or `null`.
 * - `dailyUsageCount`: Number of times the feature has been used today.
 *
 * @remark Non-premium users are subject to a daily usage limit for this feature. If the limit is reached, `generateMoodQuote` returns `null` and sets an error message.
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