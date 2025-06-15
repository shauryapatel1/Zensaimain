import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Star, Filter, Search, Award, Target, Calendar, Sparkles } from 'lucide-react';
import { useJournal } from '../hooks/useJournal';
import Logo from './Logo';
import LottieAvatar from './LottieAvatar';

interface BadgesScreenProps {
  onBack: () => void;
}

interface Badge {
  id: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  badge_category: string;
  badge_rarity: string;
  earned: boolean;
  earned_at: string | null;
  progress_current: number;
  progress_target: number;
  progress_percentage: number;
}

export default function BadgesScreen({ onBack }: BadgesScreenProps) {
  const { badges, isLoading } = useJournal();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyEarned, setShowOnlyEarned] = useState(false);

  // Filter badges based on selected filters
  const filteredBadges = useMemo(() => {
    return badges.filter(badge => {
      const matchesCategory = selectedCategory === 'all' || badge.badge_category === selectedCategory;
      const matchesRarity = selectedRarity === 'all' || badge.badge_rarity === selectedRarity;
      const matchesSearch = searchTerm === '' || 
        badge.badge_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        badge.badge_description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEarned = !showOnlyEarned || badge.earned;
      
      return matchesCategory && matchesRarity && matchesSearch && matchesEarned;
    });
  }, [badges, selectedCategory, selectedRarity, searchTerm, showOnlyEarned]);

  // Group badges by category
  const groupedBadges = useMemo(() => {
    const groups: Record<string, Badge[]> = {};
    filteredBadges.forEach(badge => {
      if (!groups[badge.badge_category]) {
        groups[badge.badge_category] = [];
      }
      groups[badge.badge_category].push(badge);
    });
    return groups;
  }, [filteredBadges]);

  // Statistics
  const stats = useMemo(() => {
    const earned = badges.filter(b => b.earned).length;
    const total = badges.length;
    const byRarity = badges.reduce((acc, badge) => {
      if (badge.earned) {
        acc[badge.rarity] = (acc[badge.rarity] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return { earned, total, byRarity };
  }, [badges]);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'from-yellow-200 to-yellow-300 border-yellow-400 text-yellow-800';
      case 'epic':
        return 'from-purple-200 to-purple-300 border-purple-400 text-purple-800';
      case 'rare':
        return 'from-blue-200 to-blue-300 border-blue-400 text-blue-800';
      default:
        return 'from-gray-200 to-gray-300 border-gray-400 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'streak':
        return <Calendar className="w-4 h-4" />;
      case 'milestone':
        return <Target className="w-4 h-4" />;
      case 'achievement':
        return <Award className="w-4 h-4" />;
      case 'special':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
          <p className="text-zen-sage-600 dark:text-gray-300 font-medium">Loading your badges...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
                <Trophy className="w-5 h-5 mr-2 text-zen-peach-500" />
                Badge Collection
              </h1>
              <p className="text-xs text-zen-sage-600 dark:text-gray-400">
                {stats.earned} of {stats.total} badges earned
              </p>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Statistics Overview */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
            <h2 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4">
              Your Achievement Progress
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-zen-mint-100 dark:bg-gray-700 rounded-2xl">
                <div className="text-2xl font-bold text-zen-mint-700 dark:text-zen-mint-400">
                  {stats.earned}
                </div>
                <div className="text-sm text-zen-sage-600 dark:text-gray-400">Total Earned</div>
              </div>
              
              <div className="text-center p-4 bg-zen-peach-100 dark:bg-gray-700 rounded-2xl">
                <div className="text-2xl font-bold text-zen-peach-700 dark:text-zen-peach-400">
                  {Math.round((stats.earned / stats.total) * 100)}%
                </div>
                <div className="text-sm text-zen-sage-600 dark:text-gray-400">Completion</div>
              </div>
              
              <div className="text-center p-4 bg-zen-lavender-100 dark:bg-gray-700 rounded-2xl">
                <div className="text-2xl font-bold text-zen-lavender-700 dark:text-zen-lavender-400">
                  {stats.byRarity.rare || 0}
                </div>
                <div className="text-sm text-zen-sage-600 dark:text-gray-400">Rare Badges</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-100 dark:bg-gray-700 rounded-2xl">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {stats.byRarity.legendary || 0}
                </div>
                <div className="text-sm text-zen-sage-600 dark:text-gray-400">Legendary</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-zen-sage-200 dark:bg-gray-600 rounded-full h-3 mb-2">
              <motion.div
                className="bg-gradient-to-r from-zen-mint-400 to-zen-peach-400 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(stats.earned / stats.total) * 100}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <p className="text-sm text-zen-sage-600 dark:text-gray-400 text-center">
              {stats.total - stats.earned} badges remaining to unlock
            </p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zen-sage-400" />
                <input
                  type="text"
                  placeholder="Search badges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zen-sage-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-zen-sage-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200"
              >
                <option value="all">All Categories</option>
                <option value="streak">Streak</option>
                <option value="milestone">Milestone</option>
                <option value="achievement">Achievement</option>
                <option value="special">Special</option>
              </select>

              {/* Rarity Filter */}
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="px-4 py-2 border border-zen-sage-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200"
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>

              {/* Earned Filter */}
              <button
                onClick={() => setShowOnlyEarned(!showOnlyEarned)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  showOnlyEarned
                    ? 'bg-zen-mint-400 text-white'
                    : 'bg-zen-sage-100 dark:bg-gray-600 text-zen-sage-600 dark:text-gray-300 hover:bg-zen-sage-200 dark:hover:bg-gray-500'
                }`}
              >
                Earned Only
              </button>
            </div>
          </div>
        </motion.div>

        {/* Badges Grid */}
        <div className="space-y-8">
          {Object.keys(groupedBadges).length === 0 ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Trophy className="w-16 h-16 text-zen-sage-400 mx-auto mb-4" />
              <h3 className="text-xl font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                No badges found
              </h3>
              <p className="text-zen-sage-600 dark:text-gray-400">
                Try adjusting your filters to see more badges.
              </p>
            </motion.div>
          ) : (
            Object.entries(groupedBadges).map(([category, categoryBadges], categoryIndex) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + categoryIndex * 0.1 }}
              >
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
                  <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-6 flex items-center space-x-2 capitalize">
                    {getCategoryIcon(category)}
                    <span>{category} Badges</span>
                    <span className="text-sm font-normal text-zen-sage-500 dark:text-gray-400">
                      ({categoryBadges.filter(b => b.earned).length}/{categoryBadges.length})
                    </span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryBadges.map((badge, badgeIndex) => (
                      <motion.div
                        key={badge.id}
                        className={`
                          relative p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105
                          ${badge.earned 
                            ? `bg-gradient-to-br ${getRarityColor(badge.badge_rarity)} shadow-lg` 
                            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 opacity-60'
                          }
                        `}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + categoryIndex * 0.1 + badgeIndex * 0.05 }}
                        whileHover={{ y: -5 }}
                      >
                        {/* Badge Icon */}
                        <div className="text-center mb-4">
                          <div className="text-4xl mb-2">{badge.badge_icon}</div>
                          <h4 className="font-display font-bold text-lg mb-1">
                            {badge.badge_name}
                          </h4>
                          <p className="text-sm opacity-80 leading-relaxed">
                            {badge.badge_description}
                          </p>
                        </div>

                        {/* Progress Bar (for unearned badges) */}
                        {!badge.earned && badge.progress_target > 1 && (
                          <div className="mb-4">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Progress</span>
                              <span>{badge.progress_current}/{badge.progress_target}</span>
                            </div>
                            <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-zen-mint-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${badge.progress_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Earned Date */}
                        {badge.earned && badge.earned_at && (
                          <div className="text-xs opacity-80 text-center">
                            Earned on {formatDate(badge.earned_at)}
                          </div>
                        )}

                        {/* Rarity Badge */}
                        <div className="absolute top-2 right-2">
                          <span className={`
                            px-2 py-1 text-xs font-bold rounded-full capitalize
                            ${badge.badge_rarity === 'legendary' ? 'bg-yellow-200 text-yellow-800' :
                              badge.badge_rarity === 'epic' ? 'bg-purple-200 text-purple-800' :
                              badge.badge_rarity === 'rare' ? 'bg-blue-200 text-blue-800' :
                              'bg-gray-200 text-gray-800'
                            }
                          `}>
                            {badge.badge_rarity}
                          </span>
                        </div>

                        {/* Earned Indicator */}
                        {badge.earned && (
                          <motion.div
                            className="absolute -top-2 -right-2 w-8 h-8 bg-zen-mint-400 rounded-full flex items-center justify-center shadow-lg"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.6 + categoryIndex * 0.1 + badgeIndex * 0.05, type: "spring" }}
                          >
                            <Star className="w-4 h-4 text-white fill-current" />
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}