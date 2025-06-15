import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Calendar, Heart, Sparkles, AlertCircle, CheckCircle, Trophy, Target, BarChart3, BookOpen, Lightbulb, RefreshCw, Save, Volume2, Settings, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../hooks/useJournal';
import Logo from './Logo';
import { usePromptGenerator } from '../hooks/usePromptGenerator';
import { useMoodAnalyzer } from '../hooks/useMoodAnalyzer';
import { useAffirmationGenerator } from '../hooks/useAffirmationGenerator';
import { useMoodQuoteGenerator } from '../hooks/useMoodQuoteGenerator';
import { useVoiceSynthesis } from '../hooks/useVoiceSynthesis';
import { usePremium } from '../hooks/usePremium';
import LottieAvatar from './LottieAvatar';
import MoodSelector from './MoodSelector';
import PhotoUpload from './PhotoUpload';
import MoodHistoryScreen from './MoodHistoryScreen';
import SettingsScreen from './SettingsScreen';
import BadgesScreen from './BadgesScreen';
import PremiumPage from './PremiumPage';
import UpsellModal from './UpsellModal';
import VoiceButton from './VoiceButton';
import ToastNotification, { ToastType } from './ToastNotification';
import { MoodLevel } from '../types';
import { moods } from '../data/moods';

export default function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const { 
    addEntry, 
    entries,
    badges,
    getStreak, 
    getBestStreak, 
    getTotalEntries, 
    hasEntryToday, 
    isLoading: journalLoading,
    error: journalError 
  } = useJournal();
  
  const [currentView, setCurrentView] = useState<'journal' | 'history' | 'settings' | 'badges' | 'premium'>('journal');
  const [selectedMood, setSelectedMood] = useState<MoodLevel>();
  const [journalEntry, setJournalEntry] = useState('');
  const [entryTitle, setEntryTitle] = useState('');
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
  const [moodQuote, setMoodQuote] = useState<{ quote: string; attribution?: string } | null>(null);
  const [showMoodQuote, setShowMoodQuote] = useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  
  // Premium features state
  const { 
    isPremium, 
    isPremiumPlus,
    isUpsellModalOpen,
    featureName,
    featureDescription,
    showUpsellModal,
    hideUpsellModal,
    hasReachedDailyLimit,
    incrementUsageCounter,
    getRemainingUses
  } = usePremium();
  
  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [toastBadge, setToastBadge] = useState<{ icon: string; name: string; rarity: string } | undefined>();
  
  // Track previous badges to detect new ones
  const [previousBadges, setPreviousBadges] = useState<string[]>([]);

  const { generatePrompt } = usePromptGenerator();
  const { analyzeMood, isAnalyzing: isMoodAnalyzing } = useMoodAnalyzer();
  const { generateAffirmation, isGenerating: isGeneratingAffirmation, error: affirmationGenerationError } = useAffirmationGenerator();
  const { generateMoodQuote, isGenerating: isGeneratingMoodQuote, error: moodQuoteError } = useMoodQuoteGenerator();
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

  // Initialize previous badges on first load
  useEffect(() => {
    if (badges.length > 0 && previousBadges.length === 0) {
      setPreviousBadges(badges.filter(b => b.earned).map(b => b.id));
    }
  }, [badges, previousBadges.length]);

  // Check for new badges and show notifications
  useEffect(() => {
    if (badges.length > 0 && previousBadges.length > 0) {
      const currentEarnedBadges = badges.filter(b => b.earned).map(b => b.id);
      const newBadges = currentEarnedBadges.filter(id => !previousBadges.includes(id));
      
      if (newBadges.length > 0) {
        // Show notification for the first new badge
        const newBadge = badges.find(b => b.id === newBadges[0]);
        if (newBadge) {
          showToast(
            `Congratulations! You've earned the "${newBadge.name}" badge!`,
            'badge',
            {
              icon: newBadge.icon,
              name: newBadge.name,
              rarity: newBadge.rarity
            }
          );
        }
        
        // Update previous badges
        setPreviousBadges(currentEarnedBadges);
      }
    }
  }, [badges, previousBadges]);

  const showToast = (message: string, type: ToastType = 'success', badge?: { icon: string; name: string; rarity: string }) => {
    setToastMessage(message);
    setToastType(type);
    setToastBadge(badge);
    setToastVisible(true);
  };

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

    // Check if user has reached daily limit for prompts
    if (!isPremium && hasReachedDailyLimit('prompt')) {
      setIsLoadingPrompt(false);
      showUpsellModal(
        'Daily Prompts',
        'Get unlimited AI-generated prompts to inspire your journaling practice.'
      );
      return;
    }
    
    // Increment usage counter for free users
    if (!isPremium) {
      incrementUsageCounter('prompt');
    }
    
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
      
      // Check if user can add a photo (premium feature)
      if (selectedPhoto && !isPremium) {
        showUpsellModal(
          'Photo Attachments',
          'Add photos to your journal entries to capture and remember special moments.'
        );
        return;
      }
      
      // Save to database
      const result = await addEntry(journalEntry.trim(), entryTitle, finalMood, selectedPhoto || undefined);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save your entry');
      }

      // Generate affirmation after successful save
      try {
        // Check if user has reached daily limit for affirmations
        if (!isPremium && hasReachedDailyLimit('affirmation')) {
          const fallbackAffirmation = getFallbackAffirmation(finalMood);
          setAffirmation(fallbackAffirmation);
          setShowAffirmation(true);
          setAffirmationError('You\'ve reached your daily limit for AI affirmations. Upgrade to Premium for unlimited affirmations!');
          return;
        }
        
        // Increment usage counter for free users
        if (!isPremium) {
          incrementUsageCounter('affirmation');
        }
        
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

      // Generate mood quote for the final mood
      if (isPremium || !hasReachedDailyLimit('mood-quote')) {
        if (!isPremium) {
          incrementUsageCounter('mood-quote');
        }
        generateMoodQuoteForMood(finalMood, journalEntry.trim());
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
      setEntryTitle('');
      setSelectedMood(undefined);
      setSelectedPhoto(null);
      setAiDetectedMood(null);
      setShowMoodSuggestion(false);
      setShowMoodQuote(false);
      setZenoVariant('greeting');
      setShowSuccess(true);

      setTimeout(() => setShowSuccess(false), 3000);
      // Keep affirmation visible longer
      setTimeout(() => setShowAffirmation(false), 8000);
      // Keep mood quote visible for a moderate duration
      setTimeout(() => setShowMoodQuote(false), 6000);
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
      // Check if user has reached daily limit for mood analysis
      if (!isPremium && hasReachedDailyLimit('mood-analysis')) {
        return;
      }
      
      const detectedMood = await analyzeMood(journalEntry);
      if (detectedMood && detectedMood !== selectedMood) {
        setAiDetectedMood(detectedMood);
        setShowMoodSuggestion(true);
        
        // Increment usage counter for free users
        if (!isPremium) {
          incrementUsageCounter('mood-analysis');
        }
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
    
    // Generate mood quote when mood is selected
    generateMoodQuoteForMood(mood);
    
    setTimeout(() => setShowMoodConfirmation(false), 3000);
  };

  const generateMoodQuoteForMood = async (mood: MoodLevel, entry?: string) => {
    try {
      // Check if user has reached daily limit for mood quotes
      if (!isPremium && hasReachedDailyLimit('mood-quote')) {
        showUpsellModal(
          'Mood Quotes',
          'Get unlimited personalized quotes that resonate with your current mood.'
        );
        return;
      }
      
      // Increment usage counter for free users
      if (!isPremium) {
        incrementUsageCounter('mood-quote');
      }
      
      const quote = await generateMoodQuote(mood, entry);
      if (quote) {
        setMoodQuote(quote);
        setShowMoodQuote(true);
      }
    } catch (err) {
      console.error('Failed to generate mood quote:', err);
    }
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

  const getContextualMessage = (): string => {
    if (entries.length === 0) return '';
    
    const recentEntry = entries[0];
    const recentMoodLevel = getMoodLevel(recentEntry.mood);
    const daysSinceLastEntry = Math.floor((Date.now() - new Date(recentEntry.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastEntry === 0) {
      // Same day
      const messages: Record<MoodLevel, string> = {
        1: 'I see you\'re going through a tough time. Remember, I\'m here with you every step of the way.',
        2: 'You\'ve been feeling low lately. Your courage to keep journaling shows your inner strength.',
        3: 'You\'re finding your balance. Each reflection brings you closer to understanding yourself.',
        4: 'Your positive energy has been shining through your recent entries. Keep nurturing that light!',
        5: 'What a joy it is to see you flourishing! Your happiness radiates through your words.'
      };
      return messages[recentMoodLevel] || 'Thank you for sharing your thoughts with me.';
    } else if (daysSinceLastEntry === 1) {
      return 'Welcome back! I\'ve been thinking about our last conversation.';
    } else if (daysSinceLastEntry <= 7) {
      return `It\'s been ${daysSinceLastEntry} days since we last talked. I\'m glad you\'re here.`;
    } else {
      return 'It\'s wonderful to have you back. I\'ve missed our conversations.';
    }
  };

  const getMoodLevel = (moodString: string): MoodLevel => {
    const moodMap: Record<string, MoodLevel> = {
      'struggling': 1,
      'low': 2,
      'neutral': 3,
      'good': 4,
      'amazing': 5
    };
    return moodMap[moodString] || 3;
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

  // Show settings view
  if (currentView === 'settings') {
    return <SettingsScreen onBack={() => setCurrentView('journal')} />;
  }

  // Show badges view
  if (currentView === 'badges') {
    return <BadgesScreen onBack={() => setCurrentView('journal')} />;
  }
  
  // Show premium view
  if (currentView === 'premium') {
    return <PremiumPage onBack={() => setCurrentView('journal')} />;
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
          <Logo size="md" />
          <h1 className="font-display font-bold text-zen-sage-800 dark:text-gray-200">Zensai</h1>
          <p className="text-xs text-zen-sage-600 dark:text-gray-400">with Zeno</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentView('history')}
            className="flex items-center space-x-2 px-3 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Journal Dashboard</span>
          </button>
          <button
            onClick={() => setCurrentView('badges')}
            className="flex items-center space-x-2 px-3 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300 relative"
          >
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Badges</span>
            {badges.filter(b => b.earned).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-zen-peach-400 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {badges.filter(
              )
              }
          )
          }
  )
}
          )
          }
  )
}
          )
          }
  )
}
          )
          }
  )
}