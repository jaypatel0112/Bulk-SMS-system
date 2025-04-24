import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';  // Import useNavigate hook

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  
  const navigate = useNavigate();  // Initialize useNavigate hook

  // Fetch function to send POST request to backend for login
  const fetchLogin = () => {
    axios.post(
      `${process.env.REACT_APP_API_URL}/api/auth/login`, 
      { username, password },
      { headers: { 'ngrok-skip-browser-warning': 'true' } } // ngrok header
    )
    .then((response) => {
      if (response.status === 200) {
        setMessage('Login successful!');
        setToken(response.data.token);  // Store the JWT token
        localStorage.setItem('token', response.data.token);  // Store token in localStorage
        
        // Redirect to the dashboard page after successful login
        navigate('/');  // Redirect to the dashboard
      } else {
        setMessage('Invalid username or password');
      }
    })
    .catch((error) => {
      setMessage('Error logging in');
      console.error('Error:', error);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate input
    if (!username || !password) {
      setMessage('Both fields are required');
      return;
    }

    // Call the fetchLogin function
    fetchLogin();
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username (Email)</label>
          <input
            type="email"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Login;
