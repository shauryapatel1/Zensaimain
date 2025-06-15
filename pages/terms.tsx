import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Head from 'next/head';
import Logo from '../src/components/Logo';

/**
 * Renders the animated Terms of Service page for the Zensai platform.
 *
 * Displays the latest terms with styled headings, animated background elements, and a navigation header including a back link and logo.
 */
export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Head>
        <title>Terms of Service | Zensai</title>
        <meta name="description" content="Zensai Terms of Service - Guidelines for using our platform" />
      </Head>

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
      <header className="relative z-10 p-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border-b border-white/20 dark:border-gray-600/20">
        <div className="container mx-auto max-w-4xl flex items-center">
          <Link href="/" passHref>
            <motion.a
              className="flex items-center space-x-2 px-4 py-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-zen-sage-600 dark:text-gray-300 hover:text-zen-sage-800 dark:hover:text-gray-100 hover:bg-white/90 dark:hover:bg-gray-600/90 rounded-full transition-all duration-300 shadow-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Home</span>
            </motion.a>
          </Link>
          <Logo size="md" className="ml-4" />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-xl border border-white/30 dark:border-gray-600/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1 
            className="text-3xl md:text-4xl font-display font-bold text-zen-sage-800 dark:text-gray-100 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Terms of Service
          </motion.h1>
          
          <motion.div 
            className="prose prose-lg prose-zen dark:prose-invert max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-zen-sage-500 dark:text-gray-400 italic">Last updated: 12 June 2025</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">1. Acceptance</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">By creating an account or using Zensai you agree to these Terms.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">2. Age Requirement</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">You must be <strong>13 years or older</strong> to use Zensai.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">3. Personal Use Licence</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">Zensai is provided "as-is" for personal, non-commercial use.<br />
            You may not resell or white-label the service without written permission.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">4. User Content</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">You retain all rights to entries you create.<br />
            By using the service you grant us a limited licence to process your text solely to deliver core features (AI analysis, voice playback, backups).</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">5. AI Output</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">AI-generated prompts and affirmations may contain inaccuracies.<br />
            Do <strong>not</strong> treat them as medical or psychological advice.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">6. Termination</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">You may delete your account at any time.<br />
            We reserve the right to suspend accounts that violate these Terms or abuse the service.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">7. Limitation of Liability</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">To the maximum extent permitted by law, Zensai is not liable for indirect or consequential damages.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">8. Governing Law</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">These Terms are governed by the laws of Ontario, Canada.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">9. Contact</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">For questions email <strong>legal@zensai.app</strong>.</p>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
    </div>
  );
}