import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Crown, CreditCard, Shield, Sparkles, Zap, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../hooks/useJournal';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface PremiumPageProps {
  onBack: () => void;
}

export default function PremiumPage({ onBack }: PremiumPageProps) {
  const { user } = useAuth();
  const { profile } = useJournal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: '$8.99',
      period: 'per month',
      features: [
        'Unlimited journal entries',
        'Advanced AI mood analysis',
        'Personalized affirmations',
        'Voice playback of affirmations',
        'Photo attachments',
        'Premium badge collection',
      ],
      popular: false,
      priceId: import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY,
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: '$60',
      period: 'per year',
      features: [
        'Everything in Monthly',
        'Save 44% compared to monthly',
        'Priority support',
        'Early access to new features',
        'Exclusive yearly subscriber badge',
      ],
      popular: true,
      priceId: import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY,
    },
  ];

  const handleSubscribe = async (priceId: string) => {
    if (!user) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const { data, error: functionError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          userId: user.id,
          email: user.email,
          name: user.name,
        },
      });
      
      if (functionError) {
        console.error('Error creating checkout session:', functionError);
        setError('Failed to create checkout session. Please try again.');
        return;
      }
      
      if (!data.success || !data.url) {
        setError(data.error || 'Failed to create checkout session');
        return;
      }
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('Error subscribing:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSubscribed = profile?.subscription_status === 'premium';
  const isYearlySubscriber = profile?.subscription_tier === 'premium_plus';
  const expiryDate = profile?.subscription_expires_at 
    ? new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

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
              <div>
                <h1 className="font-display font-bold text-zen-sage-800 dark:text-gray-200 flex items-center">
                  <Crown className="w-5 h-5 mr-2 text-yellow-500" />
                  Zensai Premium
                </h1>
                <p className="text-xs text-zen-sage-600 dark:text-gray-400">
                  Unlock the full potential of your mindfulness journey
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Current Subscription Status */}
        {isSubscribed && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-gradient-to-r from-zen-mint-100 to-zen-lavender-100 dark:from-gray-800 dark:to-gray-700 rounded-3xl p-6 shadow-xl border border-zen-mint-200 dark:border-gray-600">
              <div className="flex items-center space-x-4">
                <div className="bg-white/80 dark:bg-gray-700/80 p-3 rounded-full">
                  <Crown className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200">
                    You're a Premium Member!
                  </h2>
                  <p className="text-zen-sage-600 dark:text-gray-400">
                    {isYearlySubscriber 
                      ? 'You have a Yearly Premium subscription' 
                      : 'You have a Monthly Premium subscription'}
                    {expiryDate && ` • Renews on ${expiryDate}`}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subscription Plans */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4">
              Choose Your Premium Plan
            </h2>
            <p className="text-lg text-zen-sage-600 dark:text-gray-400 max-w-2xl mx-auto">
              Unlock the full potential of Zensai with premium features designed to enhance your mindfulness journey.
              All plans include a 7-day free trial.
            </p>
          </div>

          {/* Plan Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/60 dark:bg-gray-800/60 p-1 rounded-xl shadow-md inline-flex">
              {['monthly', 'yearly'].map((plan) => (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(plan as 'monthly' | 'yearly')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    selectedPlan === plan
                      ? 'bg-zen-mint-500 text-white shadow-md'
                      : 'text-zen-sage-600 dark:text-gray-400 hover:bg-zen-mint-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {plan === 'monthly' ? 'Monthly' : 'Yearly'}
                </button>
              ))}
            </div>
          </div>

          {/* Plan Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border ${
                  plan.popular
                    ? 'border-zen-mint-300 dark:border-zen-mint-700'
                    : 'border-white/20 dark:border-gray-600/20'
                } ${selectedPlan === plan.id ? 'ring-2 ring-zen-mint-400' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: plan.id === 'monthly' ? 0.2 : 0.3 }}
                whileHover={{ y: -5 }}
              >
                {plan.popular && (
                  <div className="bg-gradient-to-r from-zen-mint-500 to-zen-mint-600 text-white text-center py-2 font-medium text-sm">
                    Most Popular • Save 44%
                  </div>
                )}
                
                <div className="p-6">
                  <h3 className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-2">
                    {plan.name}
                  </h3>
                  
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-zen-sage-800 dark:text-gray-200">{plan.price}</span>
                    <span className="text-zen-sage-600 dark:text-gray-400 ml-1">{plan.period}</span>
                  </div>
                  
                  <div className="text-zen-sage-600 dark:text-gray-400 text-sm mb-4">
                    7-day free trial, cancel anytime
                  </div>
                  
                  <button
                    onClick={() => handleSubscribe(plan.priceId)}
                    disabled={isLoading || isSubscribed}
                    className={`w-full py-3 rounded-xl font-medium mb-6 flex items-center justify-center space-x-2 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-zen-mint-500 to-zen-mint-600 text-white hover:from-zen-mint-600 hover:to-zen-mint-700'
                        : 'bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 hover:bg-zen-sage-200 dark:hover:bg-gray-600'
                    } transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : isSubscribed ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Current Plan</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Subscribe</span>
                      </>
                    )}
                  </button>
                  
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Check className="w-4 h-4 text-zen-mint-500 mt-1 flex-shrink-0" />
                        <span className="text-zen-sage-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-600/20">
            <h3 className="text-2xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-6 text-center">
              Premium Features
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/80 dark:bg-gray-700/80 rounded-2xl p-6">
                <div className="w-12 h-12 bg-zen-mint-100 dark:bg-zen-mint-900/30 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-zen-mint-500" />
                </div>
                <h4 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                  Advanced AI Insights
                </h4>
                <p className="text-zen-sage-600 dark:text-gray-400">
                  Get deeper analysis of your moods and journaling patterns with our premium AI algorithms.
                </p>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-700/80 rounded-2xl p-6">
                <div className="w-12 h-12 bg-zen-peach-100 dark:bg-zen-peach-900/30 rounded-full flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-zen-peach-500" />
                </div>
                <h4 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                  Unlimited Entries
                </h4>
                <p className="text-zen-sage-600 dark:text-gray-400">
                  Journal as much as you want with unlimited entries and photo attachments.
                </p>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-700/80 rounded-2xl p-6">
                <div className="w-12 h-12 bg-zen-lavender-100 dark:bg-zen-lavender-900/30 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-zen-lavender-500" />
                </div>
                <h4 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                  Premium Support
                </h4>
                <p className="text-zen-sage-600 dark:text-gray-400">
                  Get priority support and early access to new features as they're developed.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-600/20">
            <h3 className="text-2xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-6 text-center">
              Frequently Asked Questions
            </h3>
            
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-white/80 dark:bg-gray-700/80 rounded-2xl p-6">
                <h4 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                  What happens after my 7-day free trial?
                </h4>
                <p className="text-zen-sage-600 dark:text-gray-400">
                  After your trial ends, you'll be charged for your selected plan. You can cancel anytime before the trial ends to avoid being charged.
                </p>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-700/80 rounded-2xl p-6">
                <h4 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                  Can I switch between monthly and yearly plans?
                </h4>
                <p className="text-zen-sage-600 dark:text-gray-400">
                  Yes, you can switch plans at any time. If you upgrade from monthly to yearly, you'll be given a prorated credit for your remaining monthly subscription.
                </p>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-700/80 rounded-2xl p-6">
                <h4 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                  How do I cancel my subscription?
                </h4>
                <p className="text-zen-sage-600 dark:text-gray-400">
                  You can cancel your subscription anytime from the Settings page. Your premium features will remain active until the end of your current billing period.
                </p>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-700/80 rounded-2xl p-6">
                <h4 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                  Is my payment information secure?
                </h4>
                <p className="text-zen-sage-600 dark:text-gray-400">
                  Yes, all payments are processed securely through Stripe. We never store your credit card information on our servers.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}