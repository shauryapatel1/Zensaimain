import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  Trash2, 
  Save, 
  X,
  Heart,
  BookOpen,
  Clock,
  TrendingUp,
  Eye,
  BarChart3,
  Sparkles,
  Crown
} from 'lucide-react';
import { useJournal } from '../hooks/useJournal';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { usePremium } from '../hooks/usePremium';
import UpsellModal from './UpsellModal';
import LottieAvatar from './LottieAvatar';
import MoodSelector from './MoodSelector';
import { MoodLevel } from '../types';
import { moods } from '../data/moods';

interface MoodHistoryScreenProps {
  onBack: () => void;
}

interface JournalEntry {
  id: string;
  content: string;
  mood: string;
  created_at: string;
  updated_at: string;
  photo_url?: string;
  photo_filename?: string;
  title?: string;
}

interface GroupedEntries {
  [date: string]: JournalEntry[];
}

export default function MoodHistoryScreen({ onBack }: MoodHistoryScreenProps) {
  const { user } = useAuth();
  const { isPremium, isUpsellModalOpen, upsellContent, showUpsellModal, hideUpsellModal } = usePremium();
  const { entries, isLoading, error, deleteEntry, updateEntry } = useJournal();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMood, setFilterMood] = useState<MoodLevel | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editMood, setEditMood] = useState<MoodLevel>(3);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  const ENTRIES_PER_PAGE = 10;
  
  // Check if we need to show the history limit message
  const showHistoryLimitMessage = !isPremium && entries.length > 0 && 
    (entries.length >= 30 || 
     (new Date().getTime() - new Date(entries[entries.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24) >= 30);

  // Helper functions
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

  const getMoodString = (level: MoodLevel): string => {
    const levelMap: Record<MoodLevel, string> = {
      1: 'struggling',
      2: 'low',
      3: 'neutral',
      4: 'good',
      5: 'amazing'
    };
    return levelMap[level];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = date.toDateString();
    const todayOnly = today.toDateString();
    const yesterdayOnly = yesterday.toDateString();
    
    if (dateOnly === todayOnly) return 'Today';
    if (dateOnly === yesterdayOnly) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDateKey = (dateString: string) => {
    return new Date(dateString).toDateString();
  };

  // Calculate mood statistics
  const moodStats = useMemo(() => {
    const stats = entries.reduce((acc, entry) => {
      const moodLevel = getMoodLevel(entry.mood);
      acc[moodLevel] = (acc[moodLevel] || 0) + 1;
      return acc;
    }, {} as Record<MoodLevel, number>);

    const total = entries.length;
    return moods.map(mood => ({
      ...mood,
      count: stats[mood.level] || 0,
      percentage: total > 0 ? Math.round(((stats[mood.level] || 0) / total) * 100) : 0
    }));
  }, [entries]);

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesMood = filterMood === 'all' || getMoodLevel(entry.mood) === filterMood;
      const matchesSearch = searchTerm === '' || 
        entry.content.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesMood && matchesSearch;
    });
  }, [entries, filterMood, searchTerm]);

  // Sort entries
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredEntries, sortOrder]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    return sortedEntries.reduce((groups: GroupedEntries, entry) => {
      const dateKey = getDateKey(entry.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
      return groups;
    }, {});
  }, [sortedEntries]);

  // Pagination
  const groupedDates = Object.keys(groupedEntries);
  const totalPages = Math.ceil(groupedDates.length / ENTRIES_PER_PAGE);
  const paginatedDates = groupedDates.slice(
    (currentPage - 1) * ENTRIES_PER_PAGE,
    currentPage * ENTRIES_PER_PAGE
  );

  // Event handlers
  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEditContent(entry.content);
    setEditTitle(entry.title || '');
    setEditMood(getMoodLevel(entry.mood));
    setSelectedEntry(null);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    try {
      const result = await updateEntry(
        editingEntry.id, 
        editContent, 
        editTitle || null, 
        editMood
      );
      if (result.success) {
        setEditingEntry(null);
        setEditContent('');
        setEditTitle('');
      }
    } catch (err) {
      console.error('Failed to update entry:', err);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      try {
        const result = await deleteEntry(entryId);
        if (result.success) {
          setSelectedEntry(null);
          setExpandedEntry(null);
        }
      } catch (err) {
        console.error('Failed to delete entry:', err);
      }
    }
  };

  const toggleEntryExpansion = (entryId: string) => {
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterMood('all');
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-zen-mint-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zen-sage-600 dark:text-gray-300 font-medium">Loading your journal history...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-zen-mint-200 dark:bg-zen-mint-800 rounded-full opacity-20"
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
          className="absolute top-40 right-20 w-24 h-24 bg-zen-lavender-200 dark:bg-zen-lavender-800 rounded-full opacity-20"
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
          className="absolute bottom-32 left-1/4 w-40 h-40 bg-zen-peach-200 dark:bg-zen-peach-800 rounded-full opacity-15"
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
        className="relative z-10 p-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border-b border-white/20 dark:border-gray-600/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <Logo size="sm" className="mr-1" />
              <h1 className="font-display font-bold text-zen-sage-800 dark:text-gray-200 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-zen-mint-500" />
                Journal Dashboard
              </h1>
              <p className="text-xs text-zen-sage-600 dark:text-gray-400">
                {filteredEntries.length} of {entries.length} entries
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2 px-3 py-2 bg-zen-mint-100 dark:bg-zen-mint-900/30 rounded-full">
              <Calendar className="w-4 h-4 text-zen-mint-600 dark:text-zen-mint-400" />
              <span className="text-zen-sage-700 dark:text-gray-300 font-medium">
                {Object.keys(groupedEntries).length} days
              </span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-2 bg-zen-peach-100 dark:bg-zen-peach-900/30 rounded-full">
              <TrendingUp className="w-4 h-4 text-zen-peach-600 dark:text-zen-peach-400" />
              <span className="text-zen-sage-700 dark:text-gray-300 font-medium">
                {entries.length} total entries
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Mood Statistics Overview */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
            <h2 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center space-x-2">
              <Heart className="w-5 h-5 text-zen-peach-500" />
              <span>Mood Distribution</span>
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {moodStats.map((mood) => (
                <motion.div
                  key={mood.level}
                  className="text-center p-4 bg-zen-sage-50 dark:bg-gray-700 rounded-2xl border border-zen-sage-100 dark:border-gray-600"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-3xl mb-2">{mood.emoji}</div>
                  <div className="text-lg font-bold text-zen-sage-800 dark:text-gray-200 mb-1">
                    {mood.count}
                  </div>
                  <div className="text-xs text-zen-sage-600 dark:text-gray-400 mb-2">
                    {mood.label}
                  </div>
                  <div className="w-full bg-zen-sage-200 dark:bg-gray-600 rounded-full h-2">
                    <motion.div
                      className="bg-zen-mint-400 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${mood.percentage}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                  <div className="text-xs text-zen-sage-500 dark:text-gray-400 mt-1">
                    {mood.percentage}%
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zen-sage-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search your journal entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-zen-sage-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 placeholder-zen-sage-400 dark:placeholder-gray-400"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-zen-sage-100 dark:hover:bg-gray-700 rounded-xl transition-all"
              >
                <Filter className="w-4 h-4" />
                <span className="font-medium">Filters</span>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {(searchTerm || filterMood !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-zen-mint-600 hover:text-zen-mint-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  className="mt-4 pt-4 border-t border-zen-sage-200 dark:border-gray-600"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mood Filter */}
                    <div>
                      <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
                        Filter by mood
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setFilterMood('all')}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            filterMood === 'all'
                              ? 'bg-zen-mint-400 text-white'
                              : 'bg-zen-sage-100 dark:bg-gray-600 text-zen-sage-600 dark:text-gray-300 hover:bg-zen-sage-200 dark:hover:bg-gray-500'
                          }`}
                        >
                          All Moods
                        </button>
                        <div className="hidden sm:block">
                          <MoodSelector
                            selectedMood={filterMood === 'all' ? undefined : filterMood}
                            onMoodSelect={(mood) => setFilterMood(mood)}
                            size="sm"
                            layout="horizontal"
                            showLabels={false}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sort Order */}
                    <div>
                      <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
                        Sort order
                      </label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSortOrder('newest')}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            sortOrder === 'newest'
                              ? 'bg-zen-mint-400 text-white'
                              : 'bg-zen-sage-100 dark:bg-gray-600 text-zen-sage-600 dark:text-gray-300 hover:bg-zen-sage-200 dark:hover:bg-gray-500'
                          }`}
                        >
                          Newest First
                        </button>
                        <button
                          onClick={() => setSortOrder('oldest')}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            sortOrder === 'oldest'
                              ? 'bg-zen-mint-400 text-white'
                              : 'bg-zen-sage-100 dark:bg-gray-600 text-zen-sage-600 dark:text-gray-300 hover:bg-zen-sage-200 dark:hover:bg-gray-500'
                          }`}
                        >
                          Oldest First
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Advanced Analytics Section (Premium Feature) */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
            <h2 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-zen-mint-500" />
              <span>Advanced Analytics</span>
              {!isPremium && (
                <span className="text-xs font-normal text-zen-peach-500 bg-zen-peach-100 dark:bg-zen-peach-900/30 px-2 py-1 rounded-full">
                  Premium
                </span>
              )}
            </h2>
            
            {isPremium ? (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-zen-mint-400 mx-auto mb-4 opacity-70" />
                <h3 className="text-xl font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                  Advanced Insights Coming Soon
                </h3>
                <p className="text-zen-sage-600 dark:text-gray-400 max-w-md mx-auto">
                  We're working on detailed mood trends, sentiment analysis, and AI-generated summaries of your emotional patterns.
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-zen-mint-50 to-zen-lavender-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-full flex-shrink-0">
                    <Crown className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-2">
                      Unlock Advanced Analytics
                    </h3>
                    <p className="text-zen-sage-600 dark:text-gray-400 mb-4">
                      Upgrade to Zensai Premium to access detailed mood trends, sentiment analysis, and AI-generated insights about your emotional patterns.
                    </p>
                    <button
                      onClick={() => showUpsellModal({
                        featureName: 'Advanced Analytics',
                        featureDescription: 'Gain deeper insights into your emotional patterns with detailed mood trends and AI-powered analysis.'
                      })}
                      className="px-4 py-2 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-colors shadow-md"
                    >
                      Upgrade to Premium
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Premium History Limit Message */}
        {showHistoryLimitMessage && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-gradient-to-r from-zen-peach-100 to-zen-lavender-100 dark:from-gray-700 dark:to-gray-600 rounded-3xl p-6 shadow-xl border border-zen-peach-200 dark:border-gray-600">
              <div className="flex items-start space-x-4">
                <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-full flex-shrink-0">
                  <Crown className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-2">
                    Unlock Your Full Journal History
                  </h3>
                  <p className="text-zen-sage-600 dark:text-gray-400 mb-4">
                    Free accounts can only access the last 30 days or 30 entries. Upgrade to Zensai Premium to unlock your complete journal history and insights.
                  </p>
                  <button
                    onClick={() => showUpsellModal({
                      featureName: 'Complete Journal History',
                      featureDescription: 'Access your entire journaling history without limits.'
                    })}
                    className="px-4 py-2 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-colors shadow-md"
                  >
                    Upgrade to Premium
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Entries Timeline */}
        <div className="space-y-8">
          {paginatedDates.length === 0 ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <LottieAvatar mood={3} size="lg" variant="idle" />
              <h3 className="text-xl font-display font-semibold text-zen-sage-800 dark:text-gray-200 mt-6 mb-2">
                No entries found
              </h3>
              <p className="text-zen-sage-600 dark:text-gray-400 mb-4">
                {searchTerm || filterMood !== 'all' 
                  ? 'Try adjusting your search or filters.'
                  : 'Start journaling to see your entries here!'
                }
              </p>
              {(searchTerm || filterMood !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 bg-zen-mint-400 text-white rounded-xl hover:bg-zen-mint-500 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </motion.div>
          ) : (
            paginatedDates.map((dateKey, dateIndex) => {
              const dayEntries = groupedEntries[dateKey];
              const averageMood = dayEntries.reduce((sum, entry) => 
                sum + getMoodLevel(entry.mood), 0
              ) / dayEntries.length;
              const roundedMood = Math.round(averageMood) as MoodLevel;
              const dayMoodData = moods.find(m => m.level === roundedMood);

              return (
                <motion.div
                  key={dateKey}
                  className="relative"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dateIndex * 0.1 }}
                >
                  {/* Date Header */}
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="flex items-center space-x-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-white/20 dark:border-gray-600/20">
                      <div className="text-3xl">{dayMoodData?.emoji}</div>
                      <div>
                        <h3 className="font-display font-bold text-zen-sage-800 dark:text-gray-200">
                          {formatDate(dayEntries[0].created_at)}
                        </h3>
                        <p className="text-sm text-zen-sage-600 dark:text-gray-400">
                          {dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'} • Average mood: {dayMoodData?.label}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Entries for this date */}
                  <div className="space-y-4 ml-8">
                    {dayEntries.map((entry, entryIndex) => {
                      const entryMoodData = moods.find(m => m.level === getMoodLevel(entry.mood));
                      const isExpanded = expandedEntry === entry.id;
                      const isEditing = editingEntry?.id === entry.id;

                      return (
                        <motion.div
                          key={entry.id}
                          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-600/20 overflow-hidden"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: entryIndex * 0.05 }}
                          whileHover={{ scale: 1.01 }}
                        >
                          {isEditing ? (
                            /* Edit Mode */
                            <div className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-display font-semibold text-zen-sage-800 dark:text-gray-200">
                                  Edit Entry
                                </h4>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={handleSaveEdit}
                                    className="p-2 text-zen-mint-600 hover:text-zen-mint-700 hover:bg-zen-mint-100 dark:hover:bg-zen-mint-900/30 rounded-lg transition-colors"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingEntry(null)}
                                    className="p-2 text-zen-sage-500 hover:text-zen-sage-700 hover:bg-zen-sage-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
                                    Title (optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="Add a title to your entry..."
                                    className="w-full px-4 py-2 border border-zen-sage-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
                                    How are you feeling?
                                  </label>
                                  <MoodSelector
                                    selectedMood={editMood}
                                    onMoodSelect={setEditMood}
                                    size="md"
                                    layout="horizontal"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
                                    Your thoughts
                                  </label>
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={6}
                                    className="w-full px-4 py-3 border border-zen-sage-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 resize-none"
                                    placeholder="What's on your mind?"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* View Mode */
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div className="text-2xl">{entryMoodData?.emoji}</div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-zen-sage-600 dark:text-gray-400">
                                        {formatTime(entry.created_at)}
                                      </span>
                                      <span className="text-xs text-zen-sage-400 dark:text-gray-500">
                                        {entryMoodData?.label}
                                      </span>
                                    </div>
                                    {entry.title && (
                                      <h4 className="font-display font-semibold text-zen-sage-800 dark:text-gray-200 mt-1">
                                        {entry.title}
                                      </h4>
                                    )}
                                  </div>
                                </div>

                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEditEntry(entry)}
                                    className="p-2 text-zen-sage-500 hover:text-zen-sage-700 hover:bg-zen-sage-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => toggleEntryExpansion(entry.id)}
                                    className="p-2 text-zen-sage-500 hover:text-zen-sage-700 hover:bg-zen-sage-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>

                              <div className={`text-zen-sage-700 dark:text-gray-300 leading-relaxed ${
                                isExpanded ? '' : 'line-clamp-3'
                              }`}>
                                {entry.content}
                              </div>

                              {entry.photo_url && (
                                <div className="mt-4">
                                  <img
                                    src={entry.photo_url}
                                    alt="Journal entry"
                                    className="rounded-xl max-w-full h-auto shadow-md"
                                  />
                                </div>
                              )}

                              {!isExpanded && entry.content.length > 150 && (
                                <button
                                  onClick={() => toggleEntryExpansion(entry.id)}
                                  className="mt-3 text-zen-mint-600 hover:text-zen-mint-700 text-sm font-medium"
                                >
                                  Read more...
                                </button>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            className="mt-12 flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-zen-mint-400 text-white'
                        : 'text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-zen-sage-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Upsell Modal */}
      {isUpsellModalOpen && upsellContent && (
        <UpsellModal
          isOpen={isUpsellModalOpen}
          onClose={hideUpsellModal}
          featureName={upsellContent.featureName}
          featureDescription={upsellContent.featureDescription}
        />
      )}
    </div>
  );
}