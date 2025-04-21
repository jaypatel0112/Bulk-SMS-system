import axios from 'axios';

const api = axios.create({
  baseURL: 'https://aa63-2601-246-5c01-7170-3143-6834-971f-2a99.ngrok-free.app /api', // adjust based on backend port
});

export default api;
