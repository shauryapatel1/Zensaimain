import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Head>
        <title>Privacy Policy | Zensai</title>
        <meta name="description" content="Zensai Privacy Policy - How we protect your data" />
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
            Privacy Policy
          </motion.h1>
          
          <motion.div 
            className="prose prose-lg prose-zen dark:prose-invert max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-zen-sage-500 dark:text-gray-400 italic">Last updated: 12 June 2025</p>

            <p className="text-zen-sage-700 dark:text-gray-300">Zensai ("<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>") respects your privacy.<br />
            This Policy explains how we collect, store, and use your data when you use the Zensai web or mobile app.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Data We Collect</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-zen-sage-700 dark:text-gray-300">
                <thead>
                  <tr>
                    <th className="text-left text-zen-sage-800 dark:text-gray-200">Category</th>
                    <th className="text-left text-zen-sage-800 dark:text-gray-200">Details</th>
                    <th className="text-left text-zen-sage-800 dark:text-gray-200">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Account data</td>
                    <td>Email address, optional display name</td>
                    <td>Log-in &amp; personalization</td>
                  </tr>
                  <tr>
                    <td>Journal entries</td>
                    <td>Text you write, optional mood label</td>
                    <td>Core feature: reflections &amp; insights</td>
                  </tr>
                  <tr>
                    <td>Usage data</td>
                    <td>Anonymous analytics events (page views, button clicks)</td>
                    <td>Improve product experience</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <blockquote>
              <p className="text-zen-sage-700 dark:text-gray-300"><strong>We never sell or rent your personal data.</strong></p>
            </blockquote>

            <h2 className="text-zen-sage-800 dark:text-gray-200">How We Use AI Services</h2>
            <ul>
              <li className="text-zen-sage-700 dark:text-gray-300"><strong>OpenAI / Anthropic</strong> models process your journal text <em>temporarily</em> to generate prompts, mood labels, and affirmations.</li>
              <li className="text-zen-sage-700 dark:text-gray-300"><strong>ElevenLabs</strong> converts affirmation text to speech.</li>
            </ul>

            <p className="text-zen-sage-700 dark:text-gray-300">These third-party processors do <strong>not</strong> store your journal text after the request completes.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Data Storage & Security</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">All data is stored in <strong>Supabase</strong> (encrypted at rest, SOC-2 certified).<br />
            Access is restricted to your authenticated account via row-level-security (RLS).</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Your Controls</h2>
            <ul>
              <li className="text-zen-sage-700 dark:text-gray-300"><strong>Export</strong>: Request a JSON export of your journal at any time (email support@zensai.app).</li>
              <li className="text-zen-sage-700 dark:text-gray-300"><strong>Delete</strong>: Delete entries individually in <em>History</em> or ask us to wipe your account.</li>
              <li className="text-zen-sage-700 dark:text-gray-300"><strong>Opt-out of analytics</strong>: Toggle "Anonymous analytics" in Settings.</li>
            </ul>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Cookies</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">We use a single secure cookie for session management; no third-party ad cookies.</p>

            <h2 className="text-zen-sage-800 dark:text-gray-200">Contact</h2>
            <p className="text-zen-sage-700 dark:text-gray-300">Questions? Email <strong>support@zensai.app</strong>.</p>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
    </div>
  );
}