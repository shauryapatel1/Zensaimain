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
  BarChart3
} from 'lucide-react';
import { useJournal } from '../hooks/useJournal';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { usePremium } from '../hooks/usePremium';
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
}

interface GroupedEntries {
  [date: string]: JournalEntry[];
}

export default function MoodHistoryScreen({ onBack }: MoodHistoryScreenProps) {
  const { user } = useAuth();
  const { isPremium, showUpsellModal } = usePremium();
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
  
  // Limit history for free users
  const limitedGroupedDates = isPremium 
    ? groupedDates 
    : groupedDates.slice(0, Math.min(30, groupedDates.length));
  
  const paginatedDates = limitedGroupedDates.slice(
    (currentPage - 1) * ENTRIES_PER_PAGE,
    currentPage * ENTRIES_PER_PAGE
  );
  
  // Check if there are older entries that free users can't access
  const hasOlderEntries = !isPremium && groupedDates.length > 30;

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
      const result = await updateEntry(editingEntry.id, editContent, editTitle || null, editMood);
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
                          {dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'} • 
                          Average mood: {dayMoodData?.label}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-zen-sage-200 dark:from-gray-600 to-transparent" />
                  </div>

                  {/* Entries for this date */}
                  <div className="space-y-4 ml-8">
                    {dayEntries.map((entry, entryIndex) => {
                      const entryMood = getMoodLevel(entry.mood);
                      const entryMoodData = moods.find(m => m.level === entryMood);
                      const isExpanded = expandedEntry === entry.id;
                      const previewLength = 150;
                      const needsExpansion = entry.content.length > previewLength;

                      return (
                        <motion.div
                          key={entry.id}
                          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-600/20 hover:shadow-xl transition-all duration-300"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (dateIndex * 0.1) + (entryIndex * 0.05) }}
                          whileHover={{ y: -2 }}
                        >
                          {/* Entry Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">{entryMoodData?.emoji}</div>
                              <div>
                                {entry.title && (
                                  <h4 className="font-medium text-zen-sage-800 dark:text-gray-200 mb-1">
                                    {entry.title}
                                  </h4>
                                )}
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-zen-sage-400 dark:text-gray-500" />
                                  <span className="text-sm font-medium text-zen-sage-600 dark:text-gray-400">
                                    {formatTime(entry.created_at)}
                                  </span>
                                  <span className="text-xs text-zen-sage-400 dark:text-gray-500">•</span>
                                  <span className="text-sm text-zen-sage-600 dark:text-gray-400">
                                    {entryMoodData?.label}
                                  </span>
                                </div>
                                <p className="text-xs text-zen-sage-500 dark:text-gray-500 mt-1">
                                  {entry.content.split(' ').length} words
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setSelectedEntry(entry)}
                                className="p-2 text-zen-sage-500 dark:text-gray-400 hover:text-zen-mint-600 hover:bg-zen-mint-100 dark:hover:bg-zen-mint-900/30 rounded-lg transition-all"
                                title="View full entry"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditEntry(entry)}
                                className="p-2 text-zen-sage-500 dark:text-gray-400 hover:text-zen-mint-600 hover:bg-zen-mint-100 dark:hover:bg-zen-mint-900/30 rounded-lg transition-all"
                                title="Edit entry"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-2 text-zen-sage-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                title="Delete entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Entry Content */}
                          <div className="text-zen-sage-700 dark:text-gray-300 leading-relaxed">
                            <p className="whitespace-pre-wrap">
                              {isExpanded || !needsExpansion
                                ? entry.content
                                : `${entry.content.substring(0, previewLength)}...`
                              }
                            </p>
                            
                            {/* Photo Display */}
                            {entry.photo_url && (
                              <div className="mt-4">
                                <img
                                  src={entry.photo_url}
                                  alt={entry.photo_filename || 'Journal photo'}
                                  className="w-full max-w-md rounded-xl shadow-md object-cover"
                                  style={{ maxHeight: '300px' }}
                                />
                              </div>
                            )}
                            
                            {needsExpansion && (
                              <button
                                onClick={() => toggleEntryExpansion(entry.id)}
                                className="mt-3 text-zen-mint-600 hover:text-zen-mint-700 text-sm font-medium flex items-center space-x-1"
                              >
                                <span>{isExpanded ? 'Show less' : 'Read more'}</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
        
        {/* Free Tier Limit Message */}
        {hasOlderEntries && !isPremium && (
          <motion.div
            className="mt-8 bg-gradient-to-r from-zen-lavender-50 to-zen-mint-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 border border-zen-lavender-200 dark:border-gray-600 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full">
                <Crown className="w-6 h-6 text-yellow-500" />
              </div>
              <h3 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200">
                Unlock Your Full Journal History
              </h3>
              <p className="text-zen-sage-600 dark:text-gray-400 max-w-md mx-auto">
                Free users can access their 30 most recent journal entries. Upgrade to Premium to unlock your complete journal history.
              </p>
              <button
                onClick={() => showUpsellModal(
                  'Full Journal History',
                  'Access your complete journaling history without any time limitations.'
                )}
                className="px-6 py-2 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-colors shadow-md"
              >
                Upgrade to Premium
              </button>
            </div>
          </motion.div>
        )}

        {/* Pagination */}
        {limitedGroupedDates.length > ENTRIES_PER_PAGE && (
          <motion.div
            className="flex justify-center items-center space-x-4 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white/80 dark:bg-gray-800/80 text-zen-sage-600 dark:text-gray-400 rounded-xl hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            
            <div className="flex space-x-2">
              {Array.from({ length: Math.ceil(limitedGroupedDates.length / ENTRIES_PER_PAGE) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-xl font-medium transition-all ${
                    currentPage === page
                      ? 'bg-zen-mint-400 text-white'
                      : 'bg-white/80 dark:bg-gray-800/80 text-zen-sage-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(Math.ceil(limitedGroupedDates.length / ENTRIES_PER_PAGE), currentPage + 1))}
              disabled={currentPage === Math.ceil(limitedGroupedDates.length / ENTRIES_PER_PAGE)}
              className="px-4 py-2 bg-white/80 dark:bg-gray-800/80 text-zen-sage-600 dark:text-gray-400 rounded-xl hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </motion.div>
        )}
        
        {/* Advanced Analytics Teaser (Premium Feature) */}
        <motion.div
          className="mt-12 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
            <h2 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-zen-mint-500" />
              <span>Advanced Analytics</span>
              <span className="text-xs font-normal text-white bg-yellow-500 px-2 py-0.5 rounded-full">
                Premium
              </span>
            </h2>
            
            {isPremium ? (
              <div className="bg-zen-mint-50 dark:bg-gray-700 rounded-2xl p-6 text-center">
                <p className="text-zen-sage-700 dark:text-gray-300 mb-4">
                  Advanced analytics and insights are coming soon to Premium users!
                </p>
                <p className="text-zen-sage-600 dark:text-gray-400 text-sm">
                  We're working on detailed mood trends, sentiment analysis, and AI-generated summaries of your emotional patterns.
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-zen-lavender-50 to-zen-mint-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 text-center">
                <p className="text-zen-sage-700 dark:text-gray-300 mb-4">
                  Unlock advanced analytics with Zensai Premium
                </p>
                <ul className="text-left mb-6 space-y-2">
                  <li className="flex items-start space-x-2">
                    <span className="text-zen-mint-500 mt-1">•</span>
                    <span className="text-zen-sage-600 dark:text-gray-400">Detailed mood trends over time</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-zen-mint-500 mt-1">•</span>
                    <span className="text-zen-sage-600 dark:text-gray-400">AI-generated insights about your emotional patterns</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-zen-mint-500 mt-1">•</span>
                    <span className="text-zen-sage-600 dark:text-gray-400">Personalized recommendations for mindfulness practices</span>
                  </li>
                </ul>
                <button
                  onClick={() => showUpsellModal(
                    'Advanced Analytics',
                    'Gain deeper insights into your emotional patterns with detailed mood trends and AI-generated summaries.'
                  )}
                  className="px-6 py-2 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-colors shadow-md"
                >
                  Upgrade to Premium
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Entry Detail Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">
                    {moods.find(m => m.level === getMoodLevel(selectedEntry.mood))?.emoji}
                  </div>
                  <div>
                    {selectedEntry.title && (
                      <h2 className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-1">
                        {selectedEntry.title}
                      </h2>
                    )}
                    <h2 className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200">
                      {formatDate(selectedEntry.created_at)}
                    </h2>
                    <p className="text-zen-sage-600 dark:text-gray-400">
                      {formatTime(selectedEntry.created_at)} • 
                      {moods.find(m => m.level === getMoodLevel(selectedEntry.mood))?.label}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-zen-sage-400 dark:text-gray-500 hover:text-zen-sage-600 dark:hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="prose prose-zen max-w-none mb-6">
                <p className="text-zen-sage-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedEntry.content}
                </p>
                
                {/* Photo Display in Modal */}
                {selectedEntry.photo_url && (
                  <div className="mt-6">
                    <img
                      src={selectedEntry.photo_url}
                      alt={selectedEntry.photo_filename || 'Journal photo'}
                      className="w-full rounded-xl shadow-lg object-cover"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-zen-sage-200 dark:border-gray-600">
                <button
                  onClick={() => handleEditEntry(selectedEntry)}
                  className="flex items-center space-x-2 px-4 py-2 bg-zen-mint-400 text-white rounded-xl hover:bg-zen-mint-500 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteEntry(selectedEntry.id)}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-400 text-white rounded-xl hover:bg-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Entry Modal */}
      <AnimatePresence>
        {editingEntry && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h2 className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-6">
                Edit Journal Entry
              </h2>
              
              {/* Title Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-3">
                  Entry Title (Optional)
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-zen-sage-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200"
                  placeholder="Give your entry a title..."
                />
              </div>
              
              {/* Mood Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-3">
                  How were you feeling?
                </label>
                <MoodSelector
                  selectedMood={editMood}
                  onMoodSelect={setEditMood}
                  size="md"
                  layout="horizontal"
                />
              </div>
              
              {/* Content Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-3">
                  Your thoughts
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-48 p-4 border border-zen-sage-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent resize-none text-zen-sage-800 dark:text-gray-200 leading-relaxed bg-white dark:bg-gray-700"
                  placeholder="Edit your journal entry..."
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-zen-sage-500 dark:text-gray-400">
                    {editContent.length} characters • {editContent.split(' ').filter(word => word.length > 0).length} words
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setEditingEntry(null)}
                  className="px-6 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                  className="flex items-center space-x-2 px-6 py-2 bg-zen-mint-400 text-white rounded-xl hover:bg-zen-mint-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}