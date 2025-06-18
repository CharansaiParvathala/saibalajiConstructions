import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'leader' | 'owner' | 'checker';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect to role-specific page if user doesn't have required role
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <>{children}</>;
} 