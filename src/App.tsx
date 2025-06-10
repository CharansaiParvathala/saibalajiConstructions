import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
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

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Protected routes */}
      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/statistics" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminStatistics />
        </ProtectedRoute>
      } />
      <Route path="/admin/vehicles" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminVehicles />
        </ProtectedRoute>
      } />
      <Route path="/admin/drivers" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDrivers />
        </ProtectedRoute>
      } />
      <Route path="/admin/backup" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminBackup />
        </ProtectedRoute>
      } />
      <Route path="/admin/credentials" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminCredentials />
        </ProtectedRoute>
      } />
      <Route path="/admin/export-data" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminExportData />
        </ProtectedRoute>
      } />
      <Route path="/admin/tenders" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminTenders />
        </ProtectedRoute>
      } />
      <Route path="/admin/create-tender" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminCreateTender />
        </ProtectedRoute>
      } />
      
      {/* Leader routes */}
      <Route path="/leader" element={
        <ProtectedRoute allowedRoles={['leader']}>
          <LeaderDashboard />
        </ProtectedRoute>
      } />
      <Route path="/leader/create-project" element={
        <ProtectedRoute allowedRoles={['leader']}>
          <LeaderCreateProject />
        </ProtectedRoute>
      } />
      <Route path="/leader/add-progress" element={
        <ProtectedRoute allowedRoles={['leader']}>
          <LeaderAddProgress />
        </ProtectedRoute>
      } />
      <Route path="/leader/view-progress" element={
        <ProtectedRoute allowedRoles={['leader']}>
          <LeaderViewProgress />
        </ProtectedRoute>
      } />
      <Route path="/leader/request-payment" element={
        <ProtectedRoute allowedRoles={['leader']}>
          <LeaderRequestPayment />
        </ProtectedRoute>
      } />
      <Route path="/leader/view-payment" element={
        <ProtectedRoute allowedRoles={['leader']}>
          <LeaderViewPayment />
        </ProtectedRoute>
      } />
      <Route path="/leader/final-submission" element={
        <ProtectedRoute allowedRoles={['leader']}>
          <LeaderFinalSubmission />
        </ProtectedRoute>
      } />
      
      {/* Owner routes */}
      <Route path="/owner" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <OwnerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/owner/projects" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <OwnerProjects />
        </ProtectedRoute>
      } />
      <Route path="/owner/statistics" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <OwnerStatistics />
        </ProtectedRoute>
      } />
      <Route path="/owner/payment-queue" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <OwnerPaymentQueue />
        </ProtectedRoute>
      } />
      <Route path="/owner/backup-links" element={
        <ProtectedRoute allowedRoles={['owner']}>
          <OwnerBackupLinks />
        </ProtectedRoute>
      } />
      
      {/* Checker routes */}
      <Route path="/checker" element={
        <ProtectedRoute allowedRoles={['checker']}>
          <CheckerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/checker/projects" element={
        <ProtectedRoute allowedRoles={['checker']}>
          <CheckerProjects />
        </ProtectedRoute>
      } />
      <Route path="/checker/review-submissions" element={
        <ProtectedRoute allowedRoles={['checker']}>
          <CheckerReviewSubmissions />
        </ProtectedRoute>
      } />
      <Route path="/checker/review-history" element={
        <ProtectedRoute allowedRoles={['checker']}>
          <CheckerReviewHistory />
        </ProtectedRoute>
      } />
      
      {/* Default route */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
