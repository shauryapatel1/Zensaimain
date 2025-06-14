import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

interface SpeechResponse {
  success: boolean;
  audio_url?: string;
  error?: string;
  timestamp: string;
}

export function useVoiceSynthesis() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateAndPlaySpeech = useCallback(async (
    text: string,
    voiceSettings?: VoiceSettings
  ): Promise<boolean> => {
    if (!text.trim()) {
      setError('Text is required for speech generation');
      return false;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const { data, error: functionError } = await supabase.functions.invoke('generate-speech', {
        body: {
          text: text.trim(),
          voice_settings: voiceSettings
        }
      });

      if (functionError) {
        console.error('Edge function error:', functionError);
        setError('Failed to generate speech');
        return false;
      }

      const response: SpeechResponse = data;
      
      if (!response.success || !response.audio_url) {
        setError(response.error || 'Failed to generate speech');
        return false;
      }

      // Create and play audio
      const audio = new Audio(response.audio_url);
      audioRef.current = audio;

      // Set up audio event listeners
      audio.addEventListener('loadstart', () => setIsPlaying(true));
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        audioRef.current = null;
      });
      audio.addEventListener('error', () => {
        setIsPlaying(false);
        setError('Failed to play audio');
        audioRef.current = null;
      });

      // Play the audio
      try {
        await audio.play();
        return true;
      } catch (playError) {
        console.error('Audio play error:', playError);
        setError('Failed to play audio. Please check your browser settings.');
        setIsPlaying(false);
        return false;
      }

    } catch (err) {
      console.error('Error generating speech:', err);
      setError('An unexpected error occurred during speech generation');
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateAndPlaySpeech,
    stopSpeech,
    clearError,
    isGenerating,
    isPlaying,
    error
  };
}