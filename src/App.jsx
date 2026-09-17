import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Terminal from '@/pages/Terminal';
import Shell from '@/components/terminal/Shell';
import StrategyEditor from '@/pages/StrategyEditor';
import RiskSettings from '@/pages/RiskSettings';
import ExecutionLogs from '@/pages/ExecutionLogs';
import SignalInspector from '@/pages/SignalInspector';
import ExecutionHistory from '@/pages/ExecutionHistory';
import PerformanceAnalytics from '@/pages/PerformanceAnalytics';
import Watchlist from '@/pages/Watchlist';
import SystemHealth from '@/pages/SystemHealth';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Shell />}>
          <Route path="/" element={<Terminal />} />
          <Route path="/strategy-editor" element={<StrategyEditor />} />
          <Route path="/risk-settings" element={<RiskSettings />} />
          <Route path="/execution-logs" element={<ExecutionLogs />} />
          <Route path="/signal-inspector" element={<SignalInspector />} />
          <Route path="/execution-history" element={<ExecutionHistory />} />
          <Route path="/performance-analytics" element={<PerformanceAnalytics />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/system-health" element={<SystemHealth />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App