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

/**
 * React hook for generating personalized prompts with AI, including premium usage checks and fallback logic.
 *
 * Provides a function to generate a prompt based on mood and prompt history, automatically handling premium feature gating, daily usage limits, and fallback prompt selection if the AI service is unavailable.
 *
 * @returns An object containing:
 * - `generatePrompt`: Asynchronously generates a prompt string, optionally based on mood and previous prompts.
 * - `isLoading`: Indicates if a prompt is currently being generated.
 * - `error`: Error message if prompt generation fails or usage limits are reached, otherwise `null`.
 * - `dailyUsageCount`: The number of prompts generated today.
 */
export function usePromptGenerator() {
  const { user } = useAuth();
  const { isPremium, trackFeatureUsage } = usePremium();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyUsageCount, setDailyUsageCount] = useState(0);

  // Fallback prompts for when the AI service is unavailable
  const getFallbackPrompt = (mood?: string, previousPrompts: string[] = []): string => {
    const moodBasedPrompts: Record<string, string[]> = {
      'very sad': [
        "What's one small thing that could bring you a moment of comfort today?",
        "If you could send a message of kindness to yourself right now, what would it say?",
        "What's one person or memory that makes you feel less alone?",
        "How can you be gentle with yourself today?"
      ],
      'sad': [
        "What's something you're grateful for, even in this difficult moment?",
        "What would you tell a friend who was feeling the way you do right now?",
        "What's one small step you could take today to care for yourself?",
        "How have you shown strength in challenging times before?"
      ],
      'neutral': [
        "What's one thing you're curious about today?",
        "How are you feeling right now, and what might be contributing to that feeling?",
        "What's something you learned about yourself recently?",
        "What would make today feel meaningful to you?"
      ],
      'happy': [
        "What's bringing you joy today, and how can you savor that feeling?",
        "How did you contribute to your own happiness today?",
        "What's something you're excited about in the near future?",
        "How can you share your positive energy with others today?"
      ],
      'very happy': [
        "What's making this such a wonderful day for you?",
        "How can you remember and recreate this feeling of joy?",
        "What would you like to celebrate about yourself today?",
        "How has your happiness impacted those around you?"
      ]
    };

    const generalPrompts = [
      "What are three things you're grateful for today, and why do they matter to you?",
      "How did you show kindness to yourself or others today?",
      "What's one small accomplishment from today that you're proud of?",
      "If you could give your past self one piece of advice, what would it be?",
      "What's something you're looking forward to, and what excites you about it?",
      "Describe a moment today when you felt most like yourself.",
      "What's one thing you learned about yourself recently that surprised you?",
      "How are you feeling right now, and what might be contributing to that feeling?",
      "What would you like to let go of today to make space for something better?",
      "What's one small moment from today that brought you joy or made you smile?"
    ];

    // Get mood-specific prompts or use general ones
    const availablePrompts = mood && moodBasedPrompts[mood] 
      ? [...moodBasedPrompts[mood], ...generalPrompts]
      : generalPrompts;

    // Filter out previously used prompts
    const filteredPrompts = availablePrompts.filter(prompt => 
      !previousPrompts.some(prev => prev.includes(prompt.substring(0, 20)))
    );

    // Use filtered prompts or fall back to all prompts if none available
    const promptsToUse = filteredPrompts.length > 0 ? filteredPrompts : availablePrompts;

    // Select a prompt based on the current date to ensure consistency
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return promptsToUse[dayOfYear % promptsToUse.length];
  };

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
        console.warn('Edge function error, using fallback:', functionError);
        // Use fallback instead of throwing error
        const fallbackPrompt = getFallbackPrompt(options?.mood, options?.previousPrompts);
        return fallbackPrompt;
      }

      const response: PromptResponse = data;
      
      if (!response.success) {
        console.warn('Prompt generation failed, using fallback:', response.error);
        // Use fallback instead of throwing error
        const fallbackPrompt = getFallbackPrompt(options?.mood, options?.previousPrompts);
        return fallbackPrompt;
      }

      return response.prompt;
    } catch (err) {
      console.warn('Error calling prompt generator, using fallback:', err);
      // Use fallback instead of throwing error
      const fallbackPrompt = getFallbackPrompt(options?.mood, options?.previousPrompts);
      return fallbackPrompt;
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