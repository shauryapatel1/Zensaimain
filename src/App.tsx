import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Footer from '../components/Footer';
import AuthScreen from './components/AuthScreen';
import AuthenticatedApp from './components/AuthenticatedApp';
import LandingPage from './components/LandingPage';

/**
 * Renders the main application routes with animated transitions and conditional navigation based on authentication state.
 *
 * Displays a loading spinner while authentication status is being determined. Once loaded, routes are rendered with enter/exit animations, and navigation is restricted or redirected according to whether the user is authenticated. A persistent footer is shown on all routed pages.
 */
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-zen-mint-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zen-sage-600 dark:text-gray-300 font-medium">Loading Zensai...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route 
          path="/landing" 
          element={
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <LandingPage />
            </motion.div>
          } 
        />
        <Route 
          path="/auth" 
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <motion.div
                key="auth"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.5 }}
              >
                <AuthScreen />
              </motion.div>
            )
          } 
        />
        <Route 
          path="/home" 
          element={
            isAuthenticated ? (
              <motion.div
                key="home"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
              >
                <AuthenticatedApp />
              </motion.div>
            ) : (
              <Navigate to="/auth" replace />
            )
          } 
        />
        <Route 
          path="/" 
          element={
            <Navigate to={isAuthenticated ? "/home" : "/landing"} replace />
          } 
        />
      </Routes>
      <Footer />
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;