
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/lib/types';
import { getCurrentUser, setCurrentUser, logoutUser, registerUser } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => void;
  logout: () => void;
  register: (name: string, email: string, password: string, phone: string) => boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  register: () => false,
  isAuthenticated: false,
  role: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // Load user from localStorage on mount
  useEffect(() => {
    const loadedUser = getCurrentUser();
    if (loadedUser) {
      setUser(loadedUser);
    }
  }, []);

  // Updated login function to properly handle user roles
  const login = (email: string, password?: string) => {
    try {
      // In a real app, we would validate credentials properly
      // For this demo, determine role from the email
      let role: UserRole = 'leader';
      
      if (email.includes('admin')) {
        role = 'admin';
      } else if (email.includes('checker')) {
        role = 'checker';
      } else if (email.includes('owner')) {
        role = 'owner';
      } else {
        role = 'leader';
      }
      
      // Create user object based on role
      const foundUser: User = { 
        id: '1', 
        name: email.split('@')[0], 
        email, 
        password: password || '', 
        role
      };
      
      setUser(foundUser);
      setCurrentUser(foundUser);
      
      // Redirect based on user role
      let redirectPath = '/';
      switch(foundUser.role) {
        case 'leader':
          redirectPath = '/leader';
          break;
        case 'checker':
          redirectPath = '/checker';
          break;
        case 'owner':
          redirectPath = '/owner';
          break;
        case 'admin':
          redirectPath = '/admin';
          break;
      }
      
      toast.success(`Welcome, ${foundUser.name}`, {
        description: `You are logged in as ${foundUser.role}`,
      });
      
      navigate(redirectPath);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    }
  };

  const logout = () => {
    setUser(null);
    logoutUser();
    toast.success("Logged out successfully");
    navigate('/login');
  };
  
  const register = (name: string, email: string, password: string, phone: string): boolean => {
    // Try registering the user - we're assigning a default role of 'leader'
    const result = registerUser(name, email, password, 'leader');
    
    if (result.success) {
      toast.success("Registration successful!", {
        description: "You can now log in with your credentials.",
      });
      return true;
    } else {
      toast.error("Registration failed", {
        description: result.message,
      });
      return false;
    }
  };

  const value = {
    user,
    login,
    logout,
    register,
    isAuthenticated: !!user,
    role: user?.role || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
