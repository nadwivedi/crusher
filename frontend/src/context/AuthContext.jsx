import { createContext, useCallback, useState, useContext, useEffect } from 'react';
import apiClient from '../utils/api';
import { setLanguage } from '../i18n/language';

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

  // A save refused because the account is deactivated: show the notice without waiting for a reload
  useEffect(() => {
    const markDeactivated = () => setUser((current) => (current && !current.adminAccess ? { ...current, deactivated: true } : current));
    window.addEventListener('account-deactivated', markDeactivated);
    return () => window.removeEventListener('account-deactivated', markDeactivated);
  }, []);

  // The signed-in person's saved language wins over what this device used last
  useEffect(() => {
    if (user?.language) setLanguage(user.language);
  }, [user?.language]);

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
    // Merged in: the reply is the account's settings, not who is signed in (role, language stay)
    if (response?.success && response?.user) {
      setUser((current) => ({ ...current, ...response.user, role: current?.role, language: current?.language }));
    }
    return response;
  };

  // Saved on the login itself (the owner, or the staff member), so it follows them to any device
  const changeLanguage = async (language) => {
    const previous = user?.language || 'en';
    setLanguage(language);
    setUser((current) => (current ? { ...current, language } : current));
    try {
      await apiClient.patch('/users/current/language', { language });
    } catch (error) {
      setLanguage(previous);
      setUser((current) => (current ? { ...current, language: previous } : current));
      throw error;
    }
  };

  // Read the account again (plan and settings may have changed since the app opened); keeps the user on failure
  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/users/current');
      if (response?.data) setUser(response.data);
    } catch {
      // Keep the details already loaded
    }
  }, []);

  const value = {
    user,
    refreshUser,
    loading,
    login,
    employeeLogin,
    adminAccessLogin,
    register,
    logout,
    updateUserSettings,
    changeLanguage,
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
