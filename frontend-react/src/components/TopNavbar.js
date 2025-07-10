import React from 'react';
import { useLocation } from 'react-router-dom';
import './TopNavbar.css';

const TopNavbar = ({ customTitle }) => {
  const location = useLocation();
  
  // Determine title based on prop or route
  const getTitle = () => {
    if (customTitle) return customTitle;
    if (location.pathname.includes('/create-campaign')) return 'Create Campaign';
    if (location.pathname.includes('/campaign-details')) return 'Campaign Management';
    return 'Campaign Management'; // Default
  };

  return (
    <div className="top-navbar">
      <div className="navbar-content">
        <h1>{getTitle()}</h1>
        <p>Hello, User welcome back!</p>
      </div>
    </div>
  );
};

export default TopNavbar;