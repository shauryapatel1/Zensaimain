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

export function useMoodAnalyzer() {
  const { user } = useAuth();
  const { isPremium, hasReachedDailyLimit, incrementUsageCounter } = usePremium();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeMood = async (journalEntry: string): Promise<MoodLevel | null> => {
    if (!journalEntry.trim()) {
      setError('Journal entry is required for mood analysis');
      return null;
    }

    // Check if user has reached daily limit for mood analysis
    if (!isPremium && hasReachedDailyLimit('mood-analysis')) {
      setError('You\'ve reached your daily limit for AI mood analysis. Upgrade to Premium for unlimited analysis!');
      return null;
    }
    
    setIsAnalyzing(true);
    setError(null);

    try {
      // Increment usage counter for free users
      if (!isPremium) {
        incrementUsageCounter('mood-analysis');
      }
      
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
    error
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