import React, { useEffect } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from '@/context/language-context';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { Toaster } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import Layout from '@/components/layout/layout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import LeaderDashboard from '@/pages/leader/LeaderDashboard';
import OwnerDashboard from '@/pages/owner/OwnerDashboard';
import CheckerDashboard from '@/pages/checker/CheckerDashboard';
import NotFound from '@/pages/NotFound';
import AdminStatistics from '@/pages/admin/AdminStatistics';
import AdminVehicles from '@/pages/admin/AdminVehicles';
import AdminDrivers from '@/pages/admin/AdminDrivers';
import AdminBackup from '@/pages/admin/AdminBackup';
import AdminCredentials from '@/pages/admin/AdminCredentials';
import AdminExportData from '@/pages/admin/AdminExportData';
import LeaderCreateProject from '@/pages/leader/LeaderCreateProject';
import LeaderAddProgress from '@/pages/leader/LeaderAddProgress';
import LeaderViewProgress from '@/pages/leader/LeaderViewProgress';
import LeaderRequestPayment from '@/pages/leader/LeaderRequestPayment';
import LeaderViewPayment from '@/pages/leader/LeaderViewPayment';
import OwnerProjects from '@/pages/owner/OwnerProjects';
import OwnerStatistics from '@/pages/owner/OwnerStatistics';
import OwnerPaymentQueue from '@/pages/owner/OwnerPaymentQueue';
import OwnerBackupLinks from '@/pages/owner/OwnerBackupLinks';
import CheckerProjects from '@/pages/checker/CheckerProjects';
import CheckerReviewSubmissions from '@/pages/checker/CheckerReviewSubmissions';
import CheckerReviewHistory from '@/pages/checker/CheckerReviewHistory';
import AdminTenders from '@/pages/admin/AdminTenders';
import LeaderFinalSubmission from '@/pages/leader/LeaderFinalSubmission';
import AdminCreateTender from '@/pages/admin/AdminCreateTender';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <LanguageProvider>
          <AuthProvider>
            <Toaster />
            <Routes>
              {/* Default route redirects to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Protected routes with layout */}
              <Route element={<Layout />}>
                {/* Dashboard routes redirect to role-specific dashboards */}
                <Route path="/dashboard" element={<DashboardRedirect />} />
                
                {/* Admin routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/statistics" element={<AdminStatistics />} />
                <Route path="/admin/vehicles" element={<AdminVehicles />} />
                <Route path="/admin/drivers" element={<AdminDrivers />} />
                <Route path="/admin/backup" element={<AdminBackup />} />
                <Route path="/admin/credentials" element={<AdminCredentials />} />
                <Route path="/admin/export-data" element={<AdminExportData />} />
                <Route path="/admin/tenders" element={<AdminTenders />} />
                <Route path="/admin/create-tender" element={<AdminCreateTender />} />
                
                {/* Leader routes */}
                <Route path="/leader" element={<LeaderDashboard />} />
                <Route path="/leader/create-project" element={<LeaderCreateProject />} />
                <Route path="/leader/add-progress" element={<LeaderAddProgress />} />
                <Route path="/leader/view-progress" element={<LeaderViewProgress />} />
                <Route path="/leader/request-payment" element={<LeaderRequestPayment />} />
                <Route path="/leader/view-payment" element={<LeaderViewPayment />} />
                <Route path="/leader/final-submission" element={<LeaderFinalSubmission />} />
                
                {/* Owner routes */}
                <Route path="/owner" element={<OwnerDashboard />} />
                <Route path="/owner/projects" element={<OwnerProjects />} />
                <Route path="/owner/statistics" element={<OwnerStatistics />} />
                <Route path="/owner/payment-queue" element={<OwnerPaymentQueue />} />
                <Route path="/owner/backup-links" element={<OwnerBackupLinks />} />
                
                {/* Checker routes */}
                <Route path="/checker" element={<CheckerDashboard />} />
                <Route path="/checker/projects" element={<CheckerProjects />} />
                <Route path="/checker/review-submissions" element={<CheckerReviewSubmissions />} />
                <Route path="/checker/review-history" element={<CheckerReviewHistory />} />
              </Route>
              
              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Component to redirect to role-specific dashboard
const DashboardRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user?.role) {
      const dashboardPath = `/${user.role}`;
      navigate(dashboardPath, { replace: true });
    }
  }, [user, navigate]);
  
  return <div>Redirecting...</div>;
};

export default App;
