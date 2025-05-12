import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setMessage('Both fields are required');
      return;
    }

    axios.post(
      `${process.env.REACT_APP_API_URL}/api/auth/login`,
      { username, password },
    )
    .then((response) => {
      if (response.status === 200) {
        // Email is encoded here for URL safety
        navigate(`/dashboard/${encodeURIComponent(username)}`); 
      } else {
        setMessage('Invalid credentials');
      }
    })
    .catch((error) => {
      setMessage('Login failed');
      console.error('Error:', error);
    });
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {message && <p className="error">{message}</p>}
    </div>
  );
};

export default Login;