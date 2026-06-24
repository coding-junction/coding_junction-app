import axios from 'axios';

// Use 'http://localhost:8000' for iOS Simulator or web
// Use 'http://10.0.2.2:8000' for Android Emulator
// Use your laptop's local IP (e.g. 'http://192.168.1.X:8000') if using a physical device via Expo
export const ROOT_URL = 'https://cj-app-backend.onrender.com';
//export const ROOT_URL = 'http://10.73.41.145:8000';
export const API_URL = `${ROOT_URL}/api/v1`;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request logger for debugging
api.interceptors.request.use(request => {
  console.log('API Request:', request.method?.toUpperCase(), request.url);
  return request;
});

api.interceptors.response.use(
  response => response,
  error => {
    console.log('API Error:', error.message, '| Path:', error.config?.url);
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const chatWithAI = async (message: string) => {
  const response = await api.post('/ai/chat', { message });
  return response.data;
};

export const loginUser = async (email: string, password: string) => {
  // Using application/x-www-form-urlencoded as per OAuth2 spec which FastAPI depends on
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);
  
  const response = await api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data;
};

export const registerUser = async (email: string, password: string, fullName: string) => {
  const response = await api.post('/auth/register', { email, password, full_name: fullName });
  return response.data;
};

export const resolveMediaURL = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${ROOT_URL}/${cleanPath}`;
};
