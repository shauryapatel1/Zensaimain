@@ .. @@
 import { AuthProvider, useAuth } from './contexts/AuthContext';
 import { ThemeProvider } from './contexts/ThemeContext';
 import AuthScreen from './components/AuthScreen';
+import PremiumPage from './components/PremiumPage';
 import AuthenticatedApp from './components/AuthenticatedApp';
 import LandingPage from './components/LandingPage';
 
@@ .. @@
+        <Route 
+          path="/premium" 
+          element={
+            isAuthenticated ? (
+              <motion.div
+                key="premium"
+                initial={{ opacity: 0, x: 100 }}
+                animate={{ opacity: 1, x: 0 }}
+                exit={{ opacity: 0, x: -100 }}
+                transition={{ duration: 0.5 }}
+              >
+                <PremiumPage onBack={() => navigate('/home')} />
+              </motion.div>
+            ) : (
+              <Navigate to="/auth" replace />
+            )
+          } 
+        />
         <Route 
           path="/" 
           element={