import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Calendar, Heart, Sparkles, AlertCircle, CheckCircle, Trophy, Target, BarChart3, BookOpen, Lightbulb, RefreshCw, Save, Volume2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../hooks/useJournal';
import { usePromptGenerator } from '../hooks/usePromptGenerator';
import { useMoodAnalyzer } from '../hooks/useMoodAnalyzer';
import { useAffirmationGenerator } from '../hooks/useAffirmationGenerator';
import { useVoiceSynthesis } from '../hooks/useVoiceSynthesis';
import LottieAvatar from './LottieAvatar';
import MoodSelector from './MoodSelector';
import MoodHistoryScreen from './MoodHistoryScreen';
import VoiceButton from './VoiceButton';
import { MoodLevel } from '../types';
import { moods } from '../data/moods';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { 
    addEntry, 
    getStreak, 
    getBestStreak, 
    getTotalEntries, 
    hasEntryToday, 
    isLoading: journalLoading,
    error: journalError 
  } = useJournal();
  
  const [currentView, setCurrentView] = useState<'journal' | 'history'>('journal');
  const [selectedMood, setSelectedMood] = useState<MoodLevel>();
  const [journalEntry, setJournalEntry] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [zenoVariant, setZenoVariant] = useState<'idle' | 'greeting' | 'journaling' | 'typing'>('greeting');
  const [successMessage, setSuccessMessage] = useState('');
  const [dailyPrompt, setDailyPrompt] = useState<string>('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [aiDetectedMood, setAiDetectedMood] = useState<MoodLevel | null>(null);
  const [showMoodSuggestion, setShowMoodSuggestion] = useState(false);
  const [affirmation, setAffirmation] = useState<string | null>(null);
  const [showAffirmation, setShowAffirmation] = useState(false);
  const [affirmationError, setAffirmationError] = useState<string | null>(null);
  const [moodConfirmed, setMoodConfirmed] = useState(false);
  const [showMoodConfirmation, setShowMoodConfirmation] = useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);

  const { generatePrompt } = usePromptGenerator();
  const { analyzeMood, isAnalyzing: isMoodAnalyzing } = useMoodAnalyzer();
  const { generateAffirmation, isGenerating: isGeneratingAffirmation, error: affirmationGenerationError } = useAffirmationGenerator();
  const { 
    generateAndPlaySpeech, 
    stopSpeech, 
    isGenerating: isGeneratingSpeech, 
    isPlaying: isSpeechPlaying,
    error: speechError,
    clearError: clearSpeechError
  } = useVoiceSynthesis();

  const streak = getStreak();
  const bestStreak = getBestStreak();
  const totalEntries = getTotalEntries();
  const alreadyJournaledToday = hasEntryToday();
  const currentMood = selectedMood ? moods.find(m => m.level === selectedMood) : undefined;

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.name || 'friend';
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDailyPrompt = () => {
    if (isLoadingPrompt) return "Loading today's reflection prompt...";
    if (promptError) return "How are you feeling today? What's on your mind?";
    if (dailyPrompt) return dailyPrompt;
    
    const prompts = [
      "What are three things you're grateful for today?",
      "How are you feeling right now, and what might be contributing to that feeling?",
      "What's one small thing that brought you joy today?",
      "If you could give your past self one piece of advice, what would it be?",
      "What's something you're looking forward to?",
      "Describe a moment today when you felt most like yourself.",
      "What's one thing you learned about yourself recently?",
      "How did you show kindness to yourself or others today?",
      "What would you like to let go of today?",
      "What's one thing you accomplished today, no matter how small?"
    ];
    
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return prompts[dayOfYear % prompts.length];
  };

  const loadDailyPrompt = async () => {
    setIsLoadingPrompt(true);
    setPromptError(null);
    
    try {
      const moodString = selectedMood ? getMoodString(selectedMood) : undefined;
      const newPrompt = await generatePrompt({
        mood: moodString,
        previousPrompts: []
      });
      
      if (newPrompt) {
        setDailyPrompt(newPrompt);
      } else {
        throw new Error('Failed to generate prompt');
      }
    } catch (err) {
      console.error('Failed to generate new prompt:', err);
      setPromptError('Failed to load today\'s prompt');
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const handleGenerateNewPrompt = async () => {
    setIsLoadingPrompt(true);
    setPromptError(null);
    
    try {
      const moodString = selectedMood ? getMoodString(selectedMood) : undefined;
      const newPrompt = await generatePrompt({
        mood: moodString,
        previousPrompts: dailyPrompt ? [dailyPrompt] : []
      });
      
      if (newPrompt) {
        setDailyPrompt(newPrompt);
      } else {
        throw new Error('Failed to generate new prompt');
      }
    } catch (err) {
      console.error('Failed to generate new prompt:', err);
      setPromptError('Failed to generate new prompt');
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  // Load initial prompt on component mount
  useEffect(() => {
    if (user) {
      loadDailyPrompt();
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!journalEntry.trim() || !selectedMood) return;

    setIsSubmitting(true);
    setError('');
    setAffirmationError(null);
    setShowAffirmation(false);
    
    try {
      // First, analyze the mood using AI
      let detectedMood: MoodLevel | null = null;
      let finalMood = selectedMood;
      
      try {
        detectedMood = await analyzeMood(journalEntry.trim());
        if (detectedMood) {
          finalMood = detectedMood;
          // Update Zeno's animation based on detected mood
          setZenoVariant(getMoodAnimation(detectedMood));
        }
      } catch (moodError) {
        console.warn('Mood analysis failed, using user-selected mood:', moodError);
        // Continue with user-selected mood if AI analysis fails
      }
      
      setZenoVariant('typing'); // Show typing animation while saving
      
      // Save to database
      const result = await addEntry(journalEntry.trim(), finalMood);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save your entry');
      }

      // Generate affirmation after successful save
      try {
        const generatedAffirmation = await generateAffirmation(journalEntry.trim(), finalMood);
        
        if (generatedAffirmation) {
          setAffirmation(generatedAffirmation);
          setShowAffirmation(true);
        } else {
          // Use fallback affirmation if generation fails
          const fallbackAffirmation = getFallbackAffirmation(finalMood);
          setAffirmation(fallbackAffirmation);
          setShowAffirmation(true);
          setAffirmationError('Sorry, I couldn\'t generate a personalized affirmation. Here\'s some encouragement from my heart!');
        }
      } catch (affirmationErr) {
        console.error('Affirmation generation failed:', affirmationErr);
        setAffirmationError('Sorry, I couldn\'t generate an affirmation. Please try again.');
      }

      // Get updated streak for success message
      const newStreak = getStreak();
      const newBestStreak = getBestStreak();
      
      // Create success message based on streak
      let message = 'Entry saved! Zeno is proud of you! 🎉';
      
      if (newStreak === 1) {
        message = 'Great start! You\'ve begun your journaling journey! 🌱';
      } else if (newStreak > 1) {
        message = `Amazing! You're on a ${newStreak}-day streak! 🔥`;
        
        if (newStreak === newBestStreak && newStreak > 1) {
          message += ' That\'s a new personal best! 🏆';
        }
      }
      
      // Add mood-specific encouragement
      if (detectedMood) {
        const moodEncouragement = getMoodEncouragement(detectedMood);
        if (moodEncouragement) {
          message += ` ${moodEncouragement}`;
        }
      }
      
      setSuccessMessage(message);

      setJournalEntry('');
      setSelectedMood(undefined);
      setAiDetectedMood(null);
      setShowMoodSuggestion(false);
      setZenoVariant('greeting');
      setShowSuccess(true);

      setTimeout(() => setShowSuccess(false), 3000);
      // Keep affirmation visible longer
      setTimeout(() => setShowAffirmation(false), 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Analyze mood when user finishes typing (with debounce)
  useEffect(() => {
    if (!journalEntry.trim() || journalEntry.length < 20) {
      setAiDetectedMood(null);
      setShowMoodSuggestion(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const detectedMood = await analyzeMood(journalEntry);
      if (detectedMood && detectedMood !== selectedMood) {
        setAiDetectedMood(detectedMood);
        setShowMoodSuggestion(true);
      }
    }, 2000); // Wait 2 seconds after user stops typing

    return () => clearTimeout(timeoutId);
  }, [journalEntry, selectedMood, analyzeMood]);

  const handleAcceptAiMood = () => {
    if (aiDetectedMood) {
      setSelectedMood(aiDetectedMood);
      setShowMoodSuggestion(false);
      setMoodConfirmed(true);
      setShowMoodConfirmation(true);
      setTimeout(() => setShowMoodConfirmation(false), 3000);
    }
  };

  const handleDismissMoodSuggestion = () => {
    setShowMoodSuggestion(false);
    setAiDetectedMood(null);
    setMoodConfirmed(true);
    setShowMoodConfirmation(true);
    setTimeout(() => setShowMoodConfirmation(false), 3000);
  };

  const handleMoodSelect = (mood: MoodLevel) => {
    setSelectedMood(mood);
    setMoodConfirmed(true);
    setShowMoodConfirmation(true);
    setTimeout(() => setShowMoodConfirmation(false), 3000);
  };

  // Update Zeno's animation based on user interaction
  useEffect(() => {
    if (isSubmitting || isGeneratingAffirmation || isGeneratingSpeech) {
      setZenoVariant('typing');
    } else if (journalEntry.length > 0) {
      setZenoVariant('journaling');
    } else if (selectedMood) {
      setZenoVariant('idle');
    } else {
      setZenoVariant('greeting');
    }
  }, [isSubmitting, isGeneratingAffirmation, isGeneratingSpeech, journalEntry, selectedMood]);

  // Helper functions
  const getMoodString = (mood: MoodLevel): string => {
    const moodMap: Record<MoodLevel, string> = {
      1: 'very sad',
      2: 'sad',
      3: 'neutral',
      4: 'happy',
      5: 'very happy'
    };
    return moodMap[mood];
  };

  const getMoodAnimation = (mood: MoodLevel): 'idle' | 'greeting' | 'journaling' | 'typing' => {
    if (mood <= 2) return 'idle';
    if (mood >= 4) return 'greeting';
    return 'idle';
  };

  const getMoodEncouragement = (mood: MoodLevel): string => {
    const encouragements: Record<MoodLevel, string> = {
      1: 'Remember, tough times don\'t last, but tough people do. 💪',
      2: 'Every small step forward is progress. You\'re doing great! 🌱',
      3: 'Balance is beautiful. You\'re exactly where you need to be. ⚖️',
      4: 'Your positive energy is contagious! Keep shining! ✨',
      5: 'What a wonderful day to celebrate your joy! 🎉'
    };
    return encouragements[mood] || '';
  };

  const getFallbackAffirmation = (mood: MoodLevel): string => {
    const affirmations: Record<MoodLevel, string> = {
      1: 'You are stronger than you know, and this difficult moment will pass. Your feelings are valid, and you deserve compassion.',
      2: 'It\'s okay to have challenging days. You\'re human, and you\'re doing the best you can. Tomorrow brings new possibilities.',
      3: 'You are perfectly balanced in this moment. Trust in your journey and know that you are exactly where you need to be.',
      4: 'Your positive energy lights up the world around you. Keep embracing the joy that flows through your life.',
      5: 'What a beautiful soul you are! Your happiness is a gift to yourself and everyone around you. Celebrate this wonderful moment!'
    };
    return affirmations[mood] || 'You are worthy of love, happiness, and all the good things life has to offer.';
  };

  // Show journal loading state
  if (journalLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-zen-mint-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zen-sage-600 dark:text-gray-300 font-medium">Loading your journal...</p>
        </motion.div>
      </div>
    );
  }

  // Show journal error state
  if (journalError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-zen-sage-800 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-zen-sage-600 mb-6">{journalError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white font-medium rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-all duration-300"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  // Show history view
  if (currentView === 'history') {
    return <MoodHistoryScreen onBack={() => setCurrentView('journal')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-zen-mint-200 rounded-full opacity-20"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-40 right-20 w-24 h-24 bg-zen-lavender-200 rounded-full opacity-20"
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-32 left-1/4 w-40 h-40 bg-zen-peach-200 rounded-full opacity-15"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header */}
      <motion.header
        className="relative z-10 p-4 flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg bg-white/20 backdrop-blur-sm">
            <LottieAvatar mood={4} size="sm" variant="greeting" animate={false} />
          </div>
          <div>
            <h1 className="font-display font-bold text-zen-sage-800 dark:text-gray-200">Zensai</h1>
            <p className="text-xs text-zen-sage-600 dark:text-gray-400">with Zeno</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentView('history')}
            className="flex items-center space-x-2 px-3 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
          </button>
          <button
            onClick={logout}
            className="p-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed top-4 right-4 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white px-6 py-4 rounded-2xl shadow-xl z-50 border border-zen-mint-300"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mood Confirmation Message */}
      <AnimatePresence>
        {showMoodConfirmation && moodConfirmed && (
          <motion.div
            className="fixed top-4 left-4 bg-gradient-to-r from-zen-peach-400 to-zen-peach-500 text-white px-6 py-4 rounded-2xl shadow-xl z-50 border border-zen-peach-300"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5" />
              <span className="font-medium">
                Mood saved! Zeno understands how you're feeling 🦊
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="fixed top-4 right-4 bg-gradient-to-r from-red-400 to-red-500 text-white px-6 py-4 rounded-2xl shadow-xl z-50 border border-red-300 max-w-sm"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Oops!</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="ml-2 text-white/80 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speech Error Message */}
      <AnimatePresence>
        {speechError && (
          <motion.div
            className="fixed bottom-4 right-4 bg-gradient-to-r from-orange-400 to-orange-500 text-white px-6 py-4 rounded-2xl shadow-xl z-50 border border-orange-300 max-w-sm"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Voice Error</p>
                <p className="text-sm opacity-90">{speechError}</p>
              </div>
              <button
                onClick={clearSpeechError}
                className="ml-2 text-white/80 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Welcome Section */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="flex justify-center mb-4">
            <LottieAvatar 
              mood={selectedMood || 3} 
              size="lg" 
              variant={zenoVariant}
            />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-2">
            {getGreeting()}
            <motion.span
              className="inline-block ml-2"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ delay: 1, duration: 0.6 }}
            >
              👋
            </motion.span>
          </h2>

          {/* Current Date */}
          <motion.p
            className="text-zen-sage-600 dark:text-gray-400 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {getCurrentDate()}
          </motion.p>

          {/* Stats Section */}
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            {/* Current Streak */}
            {streak > 0 && (
              <motion.div
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-zen-mint-200 to-zen-mint-300 rounded-full text-zen-sage-700 font-medium"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
              >
                <Calendar className="w-4 h-4" />
                <span>{streak} day streak!</span>
                <Heart className="w-4 h-4 text-zen-peach-500" />
              </motion.div>
            )}
            
            {/* Best Streak */}
            {bestStreak > 1 && (
              <motion.div
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-zen-peach-200 to-zen-peach-300 rounded-full text-zen-sage-700 font-medium"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
              >
                <Trophy className="w-4 h-4" />
                <span>Best: {bestStreak} days</span>
              </motion.div>
            )}
            
            {/* Total Entries */}
            {totalEntries > 0 && (
              <motion.div
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-zen-lavender-200 to-zen-lavender-300 rounded-full text-zen-sage-700 font-medium"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.0, type: "spring", stiffness: 200 }}
              >
                <Target className="w-4 h-4" />
                <span>{totalEntries} entries</span>
              </motion.div>
            )}
          </div>
          
          {/* Already journaled today message */}
          {alreadyJournaledToday && (
            <motion.div
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-zen-sage-200 to-zen-sage-300 rounded-full text-zen-sage-700 font-medium mb-4"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.1, type: "spring", stiffness: 200 }}
            >
              <CheckCircle className="w-4 h-4" />
              <span>You've already journaled today! Feel free to add more thoughts.</span>
            </motion.div>
          )}
        </motion.div>

        {/* Zeno's Response */}
        <AnimatePresence>
          {currentMood && (
            <motion.div className="mb-6">
              <div className="flex items-start space-x-4 max-w-lg mx-auto">
                {/* Small Zeno avatar for conversation */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <LottieAvatar 
                    mood={selectedMood} 
                    size="sm" 
                    variant="idle"
                  />
                </motion.div>
                
                {/* Speech bubble */}
                <motion.div
                  className="flex-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl rounded-tl-lg px-6 py-4 shadow-lg border border-white/20 dark:border-gray-600/20 relative"
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Speech bubble tail */}
                  <div className="absolute left-0 top-4 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white/90 dark:border-r-gray-800/90 transform -translate-x-2" />
                  
                  <p className="text-zen-sage-700 dark:text-gray-300 font-medium">
                    {currentMood.description}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zeno's Affirmation */}
        <AnimatePresence>
          {showAffirmation && affirmation && (
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
            >
              <div className="flex items-start space-x-4 max-w-2xl mx-auto">
                {/* Zeno avatar for affirmation */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <LottieAvatar 
                    mood={selectedMood || 3} 
                    size="md" 
                    variant="greeting"
                  />
                </motion.div>
                
                {/* Affirmation speech bubble */}
                <motion.div
                  className="flex-1 bg-gradient-to-br from-zen-mint-100 to-zen-peach-100 dark:from-gray-700 dark:to-gray-600 backdrop-blur-sm rounded-3xl rounded-tl-lg px-6 py-5 shadow-lg border border-zen-mint-200 dark:border-gray-500 relative"
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  {/* Speech bubble tail */}
                  <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-zen-mint-100 dark:border-r-gray-700 transform -translate-x-2" />
                  
                  <div className="flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-zen-peach-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-zen-sage-700 dark:text-gray-200 font-medium leading-relaxed">
                        {affirmation}
                      </p>
                      {affirmationError && (
                        <p className="text-zen-sage-500 dark:text-gray-400 text-sm mt-2 italic">
                          {affirmationError}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <VoiceButton
                        isGenerating={isGeneratingSpeech}
                        isPlaying={isSpeechPlaying}
                        onPlay={() => generateAndPlaySpeech(affirmation)}
                        onStop={stopSpeech}
                        size="sm"
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Daily Prompt Section */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-600/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-zen-peach-500" />
                <h3 className="font-display font-bold text-zen-sage-800 dark:text-gray-200">Today's Reflection</h3>
              </div>
              <div className="flex items-center space-x-2">
                <VoiceButton
                  isGenerating={isGeneratingSpeech}
                  isPlaying={isSpeechPlaying}
                  onPlay={() => generateAndPlaySpeech(getDailyPrompt())}
                  onStop={stopSpeech}
                  size="sm"
                />
                <button
                  onClick={handleGenerateNewPrompt}
                  disabled={isLoadingPrompt}
                  className="p-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-zen-sage-100 dark:hover:bg-gray-700 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate new prompt"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingPrompt ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <p className="text-zen-sage-700 dark:text-gray-300 leading-relaxed">
              {getDailyPrompt()}
            </p>
          </div>
        </motion.div>

        {/* Mood Selection */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-600/20">
            <h3 className="font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center space-x-2">
              <Heart className="w-5 h-5 text-zen-peach-500" />
              <span>How are you feeling?</span>
            </h3>
            <MoodSelector
              selectedMood={selectedMood}
              onMoodSelect={handleMoodSelect}
            />
          </div>
        </motion.div>

        {/* AI Mood Suggestion */}
        <AnimatePresence>
          {showMoodSuggestion && aiDetectedMood && (
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-gradient-to-r from-zen-lavender-100 to-zen-mint-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-4 border border-zen-lavender-200 dark:border-gray-500">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <LottieAvatar mood={aiDetectedMood} size="sm" variant="idle" animate={false} />
                  </div>
                  <div className="flex-1">
                    <p className="text-zen-sage-700 dark:text-gray-200 text-sm mb-3">
                      Based on your writing, I sense you might be feeling <strong>{moods.find(m => m.level === aiDetectedMood)?.name.toLowerCase()}</strong>. Would you like me to update your mood?
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAcceptAiMood}
                        className="px-4 py-2 bg-zen-mint-400 text-white text-sm font-medium rounded-xl hover:bg-zen-mint-500 transition-colors"
                      >
                        Yes, that's right
                      </button>
                      <button
                        onClick={handleDismissMoodSuggestion}
                        className="px-4 py-2 bg-zen-sage-200 dark:bg-gray-600 text-zen-sage-700 dark:text-gray-200 text-sm font-medium rounded-xl hover:bg-zen-sage-300 dark:hover:bg-gray-500 transition-colors"
                      >
                        No, keep my choice
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Journal Entry */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-600/20">
            <h3 className="font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-zen-mint-500" />
              <span>Your thoughts</span>
            </h3>
            <div className="relative">
              <textarea
                value={journalEntry}
                onChange={(e) => setJournalEntry(e.target.value)}
                onFocus={() => setIsTextareaFocused(true)}
                onBlur={() => setIsTextareaFocused(false)}
                placeholder="Share what's on your mind... Zeno is here to listen 🦊"
                className="w-full h-40 p-4 bg-zen-cream-50 dark:bg-gray-700 border-2 border-zen-cream-200 dark:border-gray-600 rounded-2xl resize-none focus:outline-none focus:border-zen-mint-400 focus:bg-white dark:focus:bg-gray-600 transition-all duration-300 text-zen-sage-700 dark:text-gray-200 placeholder-zen-sage-400 dark:placeholder-gray-400"
                disabled={isSubmitting}
              />
              
              {/* Character count */}
              <div className="absolute bottom-3 right-3 text-xs text-zen-sage-400 dark:text-gray-500">
                {journalEntry.length} characters
              </div>
            </div>
          </div>
        </motion.div>

        {/* Submit Button */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <button
            onClick={handleSubmit}
            disabled={!journalEntry.trim() || !selectedMood || isSubmitting}
            className="group relative px-8 py-4 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white font-bold rounded-2xl shadow-lg hover:from-zen-mint-500 hover:to-zen-mint-600 hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg"
          >
            <div className="flex items-center space-x-2">
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving your thoughts...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Entry</span>
                </>
              )}
            </div>
            
            {/* Sparkle effect on hover */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-ping" />
              <div className="absolute top-4 right-6 w-1 h-1 bg-white rounded-full animate-ping animation-delay-200" />
              <div className="absolute bottom-3 left-6 w-1 h-1 bg-white rounded-full animate-ping animation-delay-400" />
            </div>
          </button>
          
          {(!journalEntry.trim() || !selectedMood) && (
            <motion.p
              className="text-zen-sage-500 dark:text-gray-400 text-sm mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {!selectedMood ? 'Please select your mood first' : 'Write something to save your entry'}
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}