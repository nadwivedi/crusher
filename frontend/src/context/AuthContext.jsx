import { createContext, useCallback, useState, useContext, useEffect } from 'react';
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

  const employeeLogin = async (mobile, password) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/users/employee-login', { mobile, password });

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

  // The admin panel's one-time link: a session as that user, marked as admin access
  const adminAccessLogin = useCallback(async (token) => {
    try {
      const response = await apiClient.post('/users/admin-access', { token });
      if (response?.success && response.user) {
        setUser(response.user);
        return { success: true };
      }
      return { success: false, message: response?.message };
    } catch (error) {
      return { success: false, message: error.message || 'This access link did not work.' };
    }
  }, []);

  const logout = async () => {
    setUser(null);
    try {
      await apiClient.post('/users/logout');
    } catch (error) {
      // Clear client auth state even if the cookie was already invalid server-side.
    }
  };

  const updateUserSettings = async (settingsPayload) => {
    const response = await apiClient.patch('/users/current/settings', settingsPayload);
    if (response?.success && response?.user) {
      setUser(response.user);
    }
    return response;
  };

  const value = {
    user,
    loading,
    login,
    employeeLogin,
    adminAccessLogin,
    register,
    logout,
    updateUserSettings,
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
