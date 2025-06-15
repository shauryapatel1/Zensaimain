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

export function useMoodQuoteGenerator() {
  const { user } = useAuth();
  const { isPremium, hasReachedDailyLimit, incrementUsageCounter } = usePremium();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMoodQuote = async (
    mood: MoodLevel,
    journalEntry?: string,
    previousQuotes?: string[]
  ): Promise<{ quote: string; attribution?: string } | null> => {
    // Check if user has reached daily limit for mood quotes
    if (!isPremium && hasReachedDailyLimit('mood-quote')) {
      setError('You\'ve reached your daily limit for AI mood quotes. Upgrade to Premium for unlimited quotes!');
      return null;
    }
    
    setIsGenerating(true);
    setError(null);

    try {
      // Increment usage counter for free users
      if (!isPremium) {
        incrementUsageCounter('mood-quote');
      }
      
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