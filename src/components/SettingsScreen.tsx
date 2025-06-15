import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  Settings as SettingsIcon,
  Crown,
  LogOut, 
  Trash2, 
  Save, 
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Moon,
  Sun,
  Bell,
  Shield,
  Heart,
  Sparkles,
  Download,
  Trophy,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { usePremium } from '../hooks/usePremium';
import UpsellModal from './UpsellModal';
import { fonts } from '../data/fonts';
import Logo from './Logo';
import { useNavigate } from 'react-router-dom';
import LottieAvatar from './LottieAvatar';

interface SettingsScreenProps {
  onBack: () => void;
}

interface UserProfile {
  user_id: string;
  name: string;
  current_streak: number;
  best_streak: number;
  last_entry_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Displays and manages the user settings screen, allowing users to view and update their profile, preferences, subscription, data export, and account actions.
 *
 * Provides interfaces for editing display name and journaling goals, toggling dark mode and notifications, managing subscription status, exporting journal data, signing out, and deleting the account. Includes confirmation modals for sensitive actions and displays success or error messages based on user interactions and backend responses.
 *
 * @param onBack - Callback invoked when the user navigates back from the settings screen.
 */
export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isPremium, isUpsellModalOpen, upsellContent, showUpsellModal, hideUpsellModal } = usePremium();
  const { isDarkMode, setDarkMode } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [journalingGoal, setJournalingGoal] = useState(3);
  const [originalGoal, setOriginalGoal] = useState(3);
  
  // Font customization
  const [selectedFont, setSelectedFont] = useState('');
  
  // Preferences state
  const [notifications, setNotifications] = useState(true);
  
  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Load user profile and preferences
  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadUserPreferences();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError('');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        setError('Failed to load profile data');
        return;
      }

      setProfile(profileData);
      setDisplayName(profileData.name || user.name || '');
      setOriginalName(profileData.name || user.name || '');
      setJournalingGoal(profileData.journaling_goal_frequency || 3);
      setOriginalGoal(profileData.journaling_goal_frequency || 3);
      setSelectedFont(profileData.selected_font || 'Inter');
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPreferences = () => {
    // Load preferences from localStorage
    const savedNotifications = localStorage.getItem('zensai-notifications');
    
    setNotifications(savedNotifications !== 'false'); // Default to true
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    if (displayName.trim() === originalName && journalingGoal === originalGoal) {
      setSuccess('No changes to save');
      setTimeout(() => setSuccess(''), 3000);
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (displayName.trim() !== originalName) {
        updateData.name = displayName.trim();
      }

      if (journalingGoal !== originalGoal) {
        updateData.journaling_goal_frequency = journalingGoal;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        setError('Failed to update profile. Please try again.');
        return;
      }

      setOriginalName(displayName.trim());
      setOriginalGoal(journalingGoal);
      setProfile(prev => prev ? { 
        ...prev, 
        name: displayName.trim(),
        journaling_goal_frequency: journalingGoal
      } : null);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleDarkMode = (enabled: boolean) => {
    setDarkMode(enabled);
    setSuccess(enabled ? 'Dark mode enabled' : 'Light mode enabled');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleToggleNotifications = (enabled: boolean) => {
    setNotifications(enabled);
    localStorage.setItem('zensai-notifications', enabled.toString());
    setSuccess(enabled ? 'Notifications enabled' : 'Notifications disabled');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleExportData = async () => {
    if (!user) return;

    try {
      setIsExporting(true);
      setError('');

      const { data, error: functionError } = await supabase.functions.invoke('export-journal-data', {
        body: { user_id: user.id }
      });

      if (functionError) {
        console.error('Export function error:', functionError);
        setError('Failed to export data. Please try again.');
        return;
      }

      if (!data.success) {
        setError(data.error || 'Failed to export data');
        return;
      }

      // Create and download the file
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zensai-journal-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess('Journal data exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('An unexpected error occurred during export.');
    } finally {
      setIsExporting(false);
    }
  };
  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to sign out. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion');
      return;
    }

    try {
      setError('');
      
      const { data, error: functionError } = await supabase.functions.invoke('delete-user-data', {
        body: { user_id: user?.id }
      });

      if (functionError) {
        console.error('Delete function error:', functionError);
        setError('Failed to delete account. Please try again.');
        return;
      }

      if (!data.success) {
        setError(data.error || 'Failed to delete account');
        return;
      }

      setSuccess('Account deleted successfully. You will be signed out.');
      setTimeout(async () => {
        await logout();
      }, 2000);
      
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Delete account error:', err);
      setError('Failed to delete account. Please try again.');
    }
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const hasUnsavedChanges = displayName.trim() !== originalName || journalingGoal !== originalGoal;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-zen-mint-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zen-sage-600 dark:text-gray-300 font-medium">Loading settings...</p>
        </motion.div>
      </div>
    );
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
      </div>

      {/* Header */}
      <motion.header
        className="relative z-10 p-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border-b border-white/20 dark:border-gray-600/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="container mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {/* Logo with Zeno */}
            <div className="flex items-center space-x-3">
              <Logo size="sm" className="mr-1" />
              <h1 className="font-display font-bold text-zen-sage-800 dark:text-gray-200 flex items-center">
                <SettingsIcon className="w-5 h-5 mr-2 text-zen-mint-500" />
                Settings
              </h1>
              <p className="text-xs text-zen-sage-600 dark:text-gray-400">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <motion.div
            className="fixed top-4 right-4 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white px-6 py-4 rounded-2xl shadow-xl z-50 border border-zen-mint-300 max-w-sm"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{success}</span>
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
                <p className="font-medium text-sm">Error</p>
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20 text-center">
              <div className="flex justify-center mb-4">
                <LottieAvatar mood={4} size="lg" variant="greeting" />
              </div>
              
              <h2 className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-2">
                {profile?.name || user?.name || 'User'}
              </h2>
              
              <p className="text-zen-sage-600 dark:text-gray-400 mb-4">{user?.email}</p>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-zen-sage-600 dark:text-gray-400">Member since:</span>
                  <span className="font-medium text-zen-sage-800 dark:text-gray-200">
                    {formatJoinDate(user?.joinedDate.toISOString() || profile?.created_at || '')}
                  </span>
                </div>
                
                {profile && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-zen-sage-600 dark:text-gray-400">Current streak:</span>
                      <span className="font-medium text-zen-sage-800 dark:text-gray-200 flex items-center">
                        {profile.current_streak} days
                        {profile.current_streak > 0 && <Heart className="w-4 h-4 ml-1 text-zen-peach-500" />}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-zen-sage-600 dark:text-gray-400">Best streak:</span>
                      <span className="font-medium text-zen-sage-800 dark:text-gray-200 flex items-center">
                        {profile.best_streak} days
                        {profile.best_streak > 0 && <Sparkles className="w-4 h-4 ml-1 text-zen-mint-500" />}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-zen-sage-600 dark:text-gray-400">Badges earned:</span>
                      <span className="font-medium text-zen-sage-800 dark:text-gray-200 flex items-center">
                        {profile.total_badges_earned} badges
                        {profile.total_badges_earned > 0 && <Trophy className="w-4 h-4 ml-1 text-zen-peach-500" />}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Settings Content */}
          <motion.div
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Profile Settings */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
              <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-zen-mint-500" />
                Profile Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 border border-zen-sage-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200"
                    placeholder="Enter your display name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-3 border border-zen-sage-200 dark:border-gray-600 rounded-2xl bg-zen-sage-50 dark:bg-gray-600 text-zen-sage-600 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-zen-sage-500 dark:text-gray-400 mt-1">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
                    Weekly Journaling Goal
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="7"
                      value={journalingGoal}
                      onChange={(e) => setJournalingGoal(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-zen-sage-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                      disabled={isSaving}
                    />
                    <div className="text-center min-w-[80px]">
                      <div className="text-lg font-bold text-zen-sage-800 dark:text-gray-200">
                        {journalingGoal}
                      </div>
                      <div className="text-xs text-zen-sage-500 dark:text-gray-400">
                        {journalingGoal === 1 ? 'day/week' : 'days/week'}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-zen-sage-500 dark:text-gray-400 mt-2">
                    Set your weekly journaling goal to stay motivated and track your progress.
                  </p>
                </div>
                
                {hasUnsavedChanges && (
                  <motion.button
                    onClick={handleSaveProfile}
                    disabled={isSaving || !displayName.trim() || journalingGoal < 1 || journalingGoal > 7}
                    className="flex items-center space-x-2 px-6 py-3 bg-zen-mint-400 text-white rounded-2xl hover:bg-zen-mint-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>

            {/* App Preferences */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
              <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center">
                <SettingsIcon className="w-5 h-5 mr-2 text-zen-mint-500" />
                App Preferences
              </h3>
              
              <div className="space-y-4">
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-zen-sage-50 dark:bg-gray-700 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    {isDarkMode ? <Moon className="w-5 h-5 text-zen-sage-600 dark:text-gray-300" /> : <Sun className="w-5 h-5 text-zen-sage-600 dark:text-gray-300" />}
                    <div>
                      <h4 className="font-medium text-zen-sage-800 dark:text-gray-200">Dark Mode</h4>
                      <p className="text-sm text-zen-sage-600 dark:text-gray-400">
                        {isDarkMode ? 'Dark theme enabled' : 'Light theme enabled'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleDarkMode(!isDarkMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isDarkMode ? 'bg-zen-mint-400' : 'bg-zen-sage-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isDarkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Notifications Toggle */}
                <div className="flex items-center justify-between p-4 bg-zen-sage-50 dark:bg-gray-700 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-zen-sage-600 dark:text-gray-300" />
                    <div>
                      <h4 className="font-medium text-zen-sage-800 dark:text-gray-200">Notifications</h4>
                      <p className="text-sm text-zen-sage-600 dark:text-gray-400">
                        Gentle reminders for journaling
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleNotifications(!notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications ? 'bg-zen-mint-400' : 'bg-zen-sage-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Subscription Section */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
              <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center">
                <Crown className="w-5 h-5 mr-2 text-yellow-500" />
                Subscription
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-zen-mint-50 to-zen-lavender-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-zen-sage-800 dark:text-gray-200">Current Plan</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      profile?.subscription_status === 'premium'
                        ? 'bg-zen-mint-100 text-zen-mint-700 dark:bg-zen-mint-900/30 dark:text-zen-mint-400'
                        : 'bg-zen-sage-100 text-zen-sage-700 dark:bg-gray-600 dark:text-gray-300'
                    }`}>
                      {profile?.subscription_status === 'premium' 
                        ? profile?.subscription_tier === 'premium_plus' 
                          ? 'Premium Yearly' 
                          : 'Premium Monthly'
                        : 'Free'}
                    </span>
                  </div>
                  
                  {profile?.subscription_status === 'premium' && profile?.subscription_expires_at && (
                    <p className="text-sm text-zen-sage-600 dark:text-gray-400 mb-4">
                      Your subscription renews on {new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                  
                  {profile?.subscription_status === 'cancelled' && profile?.subscription_expires_at && (
                    <p className="text-sm text-zen-peach-600 dark:text-zen-peach-400 mb-4">
                      Your subscription is cancelled and will end on {new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                  
                  <button
                    onClick={() => navigate('/premium')}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-colors shadow-md"
                  >
                    <Crown className="w-4 h-4" />
                    <span>{profile?.subscription_status === 'premium' ? 'Manage Subscription' : 'Upgrade to Premium'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Data & Privacy Section */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
              <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-zen-mint-500" />
                Data & Privacy
              </h3>
              
              <div className="space-y-4">
                <button
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="flex items-center space-x-2 px-4 py-3 bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 rounded-2xl hover:bg-zen-sage-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-zen-sage-600 border-t-transparent rounded-full animate-spin" />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Export Journal Data</span>
                    </>
                  )}
                </button>
                
                <p className="text-xs text-zen-sage-500 dark:text-gray-400">
                  Download all your journal entries and data in JSON format.
                </p>
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
              <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-zen-peach-500" />
                Account Actions
              </h3>
              
              <div className="space-y-4">
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center space-x-2 px-4 py-3 bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 rounded-2xl hover:bg-zen-sage-200 dark:hover:bg-gray-600 transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
                
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center space-x-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors w-full"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-white/20 dark:border-gray-600/20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4">
                Sign Out
              </h3>
              <p className="text-zen-sage-600 dark:text-gray-400 mb-6">
                Are you sure you want to sign out? You'll need to sign in again to access your journal.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-3 bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 rounded-2xl hover:bg-zen-sage-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-3 bg-zen-peach-400 text-white rounded-2xl hover:bg-zen-peach-500 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-white/20 dark:border-gray-600/20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <h3 className="text-lg font-display font-bold text-red-600 dark:text-red-400 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Delete Account
              </h3>
              <p className="text-zen-sage-600 dark:text-gray-400 mb-4">
                This action cannot be undone. All your journal entries, progress, and data will be permanently deleted.
              </p>
              <p className="text-zen-sage-600 dark:text-gray-400 mb-6">
                Type <strong>DELETE</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-3 border border-zen-sage-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 mb-6"
                placeholder="Type DELETE to confirm"
              />
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 px-4 py-3 bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 rounded-2xl hover:bg-zen-sage-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE'}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upsell Modal */}
      <UpsellModal
        isOpen={isUpsellModalOpen}
        onClose={hideUpsellModal}
        content={upsellContent}
      />
    </div>
  );
}