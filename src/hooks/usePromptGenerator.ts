import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from './usePremium';

interface PromptResponse {
  success: boolean;
  prompt: string;
  generated_by: 'ai' | 'fallback';
  error?: string;
  timestamp: string;
}

export function usePromptGenerator() {
  const { user } = useAuth();
  const { isPremium, trackFeatureUsage } = usePremium();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyUsageCount, setDailyUsageCount] = useState(0);

  const generatePrompt = async (options?: {
    mood?: string;
    previousPrompts?: string[];
  }): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    
    // Check if free user has reached daily limit
    if (!isPremium && !trackFeatureUsage('prompt-generator')) {
      setError('Daily limit reached. Upgrade to Premium for unlimited prompts.');
      setIsLoading(false);
      return null;
    }

    try {
      const { data, error: functionError } = await supabase.functions.invoke('generate-prompt', {
        body: {
          name: user?.name,
          mood: options?.mood,
          previousPrompts: options?.previousPrompts || []
        }
      });

      if (functionError) {
        console.error('Edge function error:', functionError);
        setError('Failed to generate prompt');
        return null;
      }

      const response: PromptResponse = data;
      
      if (!response.success) {
        setError(response.error || 'Failed to generate prompt');
        return null;
      }

      return response.prompt;
    } catch (err) {
      console.error('Error calling prompt generator:', err);
      setError('An unexpected error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generatePrompt,
    isLoading,
    error,
    dailyUsageCount
  };
}