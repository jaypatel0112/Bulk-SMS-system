import React, { useState } from 'react';
import axios from 'axios';

const Signup = () => {
  // State to hold form data
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(2); // Default role is 'user' (represented by 2)
  const [message, setMessage] = useState(''); // To display success/error message

  // Fetch function to send POST request to backend for signup
  const fetchSignup = () => {
    axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/signup`,  // Adjust to your API endpoint if needed
        {
          username,
          password,
          role, // Send numeric role value (1 for admin, 2 for user)
        },
        {
          headers: { 'ngrok-skip-browser-warning': 'true' }, // ngrok header
        }
      )
      .then((response) => {
        if (response.status === 201) {
          setMessage('User created successfully!');
        } else {
          setMessage('Something went wrong');
        }
      })
      .catch((error) => {
        setMessage('Error creating user');
        console.error('Error:', error);
      });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate input
    if (!username || !password || !role) {
      setMessage('All fields are required');
      return;
    }

    // Call the fetchSignup function
    fetchSignup();
  };

  return (
    <div>
      <h2>Signup</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username</label>
          <input
            type="text"
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
        <div>
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(parseInt(e.target.value))} // Ensure role is an integer
          >
            <option value={1}>Admin</option>
            <option value={2}>User</option>
          </select>
        </div>
        <button type="submit">Sign Up</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Signup;
