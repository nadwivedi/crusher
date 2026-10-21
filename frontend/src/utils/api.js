import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Handle responses
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // The account was deactivated while signed in: the app shows the deactivated notice
    if (error.response?.data?.code === 'ACCOUNT_DEACTIVATED') {
      window.dispatchEvent(new Event('account-deactivated'));
    }
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default apiClient;
