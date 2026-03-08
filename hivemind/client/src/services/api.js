import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
	baseURL: API_BASE_URL,
	timeout: 15000,
});

export const setAuthToken = (token) => {
	if (token) {
		api.defaults.headers.common.Authorization = `Bearer ${token}`;
	} else {
		delete api.defaults.headers.common.Authorization;
	}
};

export const authApi = {
	register: (payload) => api.post('/auth/register', payload),
	login: (payload) => api.post('/auth/login', payload),
	me: () => api.get('/auth/me'),
};

export const roomApi = {
	create: (payload) => api.post('/rooms', payload),
};
