import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // adjust based on backend port
});

export default api;
