import { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const response = await apiClient.get('/users/current');
        setUser(response.data || null);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async (emailOrPhone, password) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/users/login', { emailOrPhone, password });

      if (response.success) {
        setUser(response.user);
        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { success: false, message: error.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (signupData) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/users/register', signupData);

      if (response.success) {
        setUser(response.user);
        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { success: false, message: error.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    try {
      await apiClient.post('/users/logout');
    } catch (error) {
      // Clear client auth state even if the cookie was already invalid server-side.
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
