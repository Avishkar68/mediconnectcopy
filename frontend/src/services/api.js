import axios from 'axios';

// Create custom Axios client with defaults
let baseURL = import.meta.env.VITE_API_URL || 'https://mediconnectcopy.onrender.com';
if (!baseURL.endsWith('/api')) {
  baseURL = baseURL.replace(/\/$/, '') + '/api';
}

const api = axios.create({
  baseURL,
  withCredentials: true, // Crucial for receiving/sending HTTP-only session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to format errors and extract data
api.interceptors.response.use(
  (response) => {
    // If the backend returns our standard sendSuccess structure, pass the raw data object down
    return response.data;
  },
  (error) => {
    // Standardize error message extraction
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong with the connection.';

    // Attach details and reject promise
    const customError = new Error(message);
    customError.response = error.response;
    customError.status = error.response?.status;

    return Promise.reject(customError);
  }
);

export default api;
