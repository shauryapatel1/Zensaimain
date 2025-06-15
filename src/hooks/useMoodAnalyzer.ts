import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from './usePremium';
import { MoodLevel } from '../types';

interface MoodAnalysisResponse {
  success: boolean;
  mood: string;
  confidence?: number;
  analysis?: string;
  error?: string;
  timestamp: string;
}

/**
 * React hook for analyzing the mood of a journal entry using a backend service, with premium feature gating and error handling.
 *
 * Provides an `analyzeMood` function that processes a journal entry and returns a numeric mood level or `null` if analysis fails. Tracks analysis state, error messages, and daily usage count.
 *
 * @returns An object containing:
 * - `analyzeMood`: Function to analyze the mood of a journal entry.
 * - `isAnalyzing`: Whether a mood analysis is currently in progress.
 * - `error`: Error message if analysis fails, or `null`.
 * - `dailyUsageCount`: Number of times the mood analyzer has been used today.
 *
 * @remark Non-premium users are subject to a daily usage limit for mood analysis. If the limit is reached, further analysis attempts will return `null` and set an error message.
 */
export function useMoodAnalyzer() {
  const { user } = useAuth();
  const { isPremium, trackFeatureUsage } = usePremium();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyUsageCount, setDailyUsageCount] = useState(0);

  const analyzeMood = async (journalEntry: string): Promise<MoodLevel | null> => {
    if (!journalEntry.trim()) {
      setError('Journal entry is required for mood analysis');
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    // Check if free user has reached daily limit
    if (!isPremium && !trackFeatureUsage('mood-analyzer')) {
      setError('Daily limit reached. Upgrade to Premium for unlimited mood analysis.');
      setIsAnalyzing(false);
      return null;
    }

    try {
      const { data, error: functionError } = await supabase.functions.invoke('analyze-mood', {
        body: {
          entry: journalEntry.trim(),
          name: user?.name
        }
      });

      if (functionError) {
        console.error('Edge function error:', functionError);
        setError('Failed to analyze mood');
        return null;
      }

      const response: MoodAnalysisResponse = data;
      
      if (!response.success) {
        setError(response.error || 'Failed to analyze mood');
        // Return neutral as fallback
        return 3;
      }

      // Convert mood string to MoodLevel
      const moodLevel = convertMoodStringToLevel(response.mood);
      return moodLevel;
    } catch (err) {
      console.error('Error calling mood analyzer:', err);
      setError('An unexpected error occurred during mood analysis');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeMood,
    isAnalyzing,
    error,
    dailyUsageCount
  };
}

// Helper function to convert mood string to MoodLevel
function convertMoodStringToLevel(mood: string): MoodLevel {
  const normalizedMood = mood.toLowerCase().trim();
  
  // Direct matches
  switch (normalizedMood) {
    case 'struggling':
      return 1;
    case 'low':
      return 2;
    case 'neutral':
      return 3;
    case 'good':
      return 4;
    case 'amazing':
      return 5;
  }
  
  // Handle variations and synonyms
  if (normalizedMood.includes('depress') || normalizedMood.includes('despair') || 
      normalizedMood.includes('hopeless') || normalizedMood.includes('overwhelm') ||
      normalizedMood.includes('anxious') || normalizedMood.includes('panic') ||
      normalizedMood.includes('stressed') || normalizedMood.includes('terrible')) {
    return 1; // struggling
  }
  
  if (normalizedMood.includes('sad') || normalizedMood.includes('down') || 
      normalizedMood.includes('disappoint') || normalizedMood.includes('melancholy') ||
      normalizedMood.includes('blue') || normalizedMood.includes('upset') ||
      normalizedMood.includes('worried') || normalizedMood.includes('concern')) {
    return 2; // low
  }
  
  if (normalizedMood.includes('happy') || normalizedMood.includes('joy') || 
      normalizedMood.includes('pleased') || normalizedMood.includes('content') ||
      normalizedMood.includes('satisfied') || normalizedMood.includes('positive') ||
      normalizedMood.includes('optimistic') || normalizedMood.includes('hopeful') ||
      normalizedMood.includes('cheerful') || normalizedMood.includes('upbeat')) {
    return 4; // good
  }
  
  if (normalizedMood.includes('ecstatic') || normalizedMood.includes('elated') || 
      normalizedMood.includes('thrilled') || normalizedMood.includes('euphoric') ||
      normalizedMood.includes('fantastic') || normalizedMood.includes('wonderful') ||
      normalizedMood.includes('excellent') || normalizedMood.includes('brilliant') ||
      normalizedMood.includes('incredible') || normalizedMood.includes('overjoyed')) {
    return 5; // amazing
  }
  
  // Default to neutral for unrecognized emotions
  return 3;
}