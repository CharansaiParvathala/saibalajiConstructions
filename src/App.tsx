import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/navbar';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import LeaderDashboard from './pages/leader/LeaderDashboard';
import LeaderCreateProject from './pages/leader/LeaderCreateProject';
import LeaderProjectDetails from './pages/leader/LeaderProjectDetails';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerProjectDetails from './pages/owner/OwnerProjectDetails';
import CheckerDashboard from './pages/checker/CheckerDashboard';
import CheckerProjectDetails from './pages/checker/CheckerProjectDetails';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProjectDetails from './pages/admin/AdminProjectDetails';
import AdminStatistics from './pages/admin/AdminStatistics';
import AdminVehicles from './pages/admin/AdminVehicles';
import AdminDrivers from './pages/admin/AdminDrivers';
import AdminBackup from './pages/admin/AdminBackup';
import AdminCredentials from './pages/admin/AdminCredentials';
import AdminExportData from './pages/admin/AdminExportData';
import AdminCreateTender from './pages/admin/AdminCreateTender';
import AdminTenderImages from './pages/admin/AdminTenderImages';
import LeaderAddProgress from './pages/leader/LeaderAddProgress';
import LeaderViewProgress from './pages/leader/LeaderViewProgress';
import LeaderRequestPayment from './pages/leader/LeaderRequestPayment';
import LeaderViewPayment from './pages/leader/LeaderViewPayment';
import LeaderFinalSubmission from './pages/leader/LeaderFinalSubmission';
import OwnerProjects from './pages/owner/OwnerProjects';
import OwnerStatistics from './pages/owner/OwnerStatistics';
import OwnerPaymentQueue from './pages/owner/OwnerPaymentQueue';
import OwnerBackupLinks from './pages/owner/OwnerBackupLinks';
import CheckerProjects from './pages/checker/CheckerProjects';
import CheckerReviewSubmissions from './pages/checker/CheckerReviewSubmissions';
import CheckerReviewHistory from './pages/checker/CheckerReviewHistory';
import LeaderPaymentDetails from './pages/leader/LeaderPaymentDetails';
import OwnerCredentials from './pages/owner/OwnerCredentials';
import CheckerReviewSubmissionDetails from './pages/checker/CheckerReviewSubmissionDetails';
import EditTenderImage from './pages/admin/EditTenderImage';

function App() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(location.pathname);

  return (
    <AuthProvider>
      {!isAuthPage && <Navbar />}
            <Routes>
      {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
      {/* Protected routes */}
        <Route
          path="/leader"
          element={
            <ProtectedRoute requiredRole="leader">
              <LeaderDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leader/projects/new"
          element={
            <ProtectedRoute requiredRole="leader">
              <LeaderCreateProject />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leader/projects/:projectId"
          element={
            <ProtectedRoute requiredRole="leader">
              <LeaderProjectDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner"
          element={
            <ProtectedRoute requiredRole="owner">
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/project-details/:projectId"
          element={
            <ProtectedRoute requiredRole="owner">
              <OwnerProjectDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checker"
          element={
            <ProtectedRoute requiredRole="checker">
              <CheckerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checker/projects/:projectId"
          element={
            <ProtectedRoute requiredRole="checker">
              <CheckerProjectDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
          }
        />
        <Route
          path="/admin/projects/:projectId"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminProjectDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/statistics"
          element={
            <ProtectedRoute requiredRole="admin">
          <AdminStatistics />
        </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vehicles"
          element={
            <ProtectedRoute requiredRole="admin">
          <AdminVehicles />
        </ProtectedRoute>
          }
        />
        <Route
          path="/admin/drivers"
          element={
            <ProtectedRoute requiredRole="admin">
          <AdminDrivers />
        </ProtectedRoute>
          }
        />
        <Route
          path="/admin/backup"
          element={
            <ProtectedRoute requiredRole="admin">
          <AdminBackup />
        </ProtectedRoute>
          }
        />
        <Route
          path="/admin/credentials"
          element={
            <ProtectedRoute requiredRole="admin">
          <AdminCredentials />
        </ProtectedRoute>
          }
        />
        <Route
          path="/admin/export-data"
          element={
            <ProtectedRoute requiredRole="admin">
          <AdminExportData />
        </ProtectedRoute>
          }
        />
        <Route
          path="/admin/create-tender"
          element={
            <ProtectedRoute requiredRole="admin">
          <AdminCreateTender />
        </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tender-images"
          element={
            <ProtectedRoute requiredRole="admin">
          <AdminTenderImages />
        </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tender-images/:id/edit"
          element={
            <ProtectedRoute requiredRole="admin">
              <EditTenderImage />
        </ProtectedRoute>
          }
        />

        <Route
          path="/leader/add-progress"
          element={
            <ProtectedRoute requiredRole="leader">
          <LeaderAddProgress />
        </ProtectedRoute>
          }
        />
        <Route
          path="/leader/view-progress"
          element={
            <ProtectedRoute requiredRole="leader">
          <LeaderViewProgress />
        </ProtectedRoute>
          }
        />
        <Route
          path="/leader/view-progress/:projectId"
          element={
            <ProtectedRoute requiredRole="leader">
          <LeaderViewProgress />
        </ProtectedRoute>
          }
        />
        <Route
          path="/leader/request-payment"
          element={
            <ProtectedRoute requiredRole="leader">
          <LeaderRequestPayment />
        </ProtectedRoute>
          }
        />
        <Route
          path="/leader/view-payment"
          element={
            <ProtectedRoute requiredRole="leader">
          <LeaderViewPayment />
        </ProtectedRoute>
          }
        />
        <Route
          path="/leader/final-submission"
          element={
            <ProtectedRoute requiredRole="leader">
          <LeaderFinalSubmission />
        </ProtectedRoute>
          }
        />

        <Route
          path="/owner/projects"
          element={
            <ProtectedRoute requiredRole="owner">
          <OwnerProjects />
        </ProtectedRoute>
          }
        />
        <Route
          path="/owner/statistics"
          element={
            <ProtectedRoute requiredRole="owner">
          <OwnerStatistics />
        </ProtectedRoute>
          }
        />
        <Route
          path="/owner/payment-queue"
          element={
            <ProtectedRoute requiredRole="owner">
          <OwnerPaymentQueue />
        </ProtectedRoute>
          }
        />
        <Route
          path="/owner/backup-links"
          element={
            <ProtectedRoute requiredRole="owner">
          <OwnerBackupLinks />
        </ProtectedRoute>
          }
        />
        <Route
          path="/owner/credentials"
          element={
            <ProtectedRoute requiredRole="owner">
              <OwnerCredentials />
        </ProtectedRoute>
          }
        />

        <Route
          path="/checker/projects"
          element={
            <ProtectedRoute requiredRole="checker">
          <CheckerProjects />
        </ProtectedRoute>
          }
        />
        <Route
          path="/checker/review-submissions"
          element={
            <ProtectedRoute requiredRole="checker">
          <CheckerReviewSubmissions />
        </ProtectedRoute>
          }
        />
        <Route
          path="/checker/review-history"
          element={
            <ProtectedRoute requiredRole="checker">
          <CheckerReviewHistory />
        </ProtectedRoute>
          }
        />
        <Route
          path="/checker/review-submissions/:id"
          element={
            <ProtectedRoute requiredRole="checker">
              <CheckerReviewSubmissionDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leader/payment/:id"
          element={
            <ProtectedRoute requiredRole="leader">
              <LeaderPaymentDetails />
        </ProtectedRoute>
          }
        />
      
        {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
              
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
      <Toaster />
    </AuthProvider>
  );
    }

export default App;
