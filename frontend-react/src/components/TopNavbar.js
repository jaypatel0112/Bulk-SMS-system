import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import './TopNavbar.css';

function getNameFromEmail(email) {
  if (!email) return '';
  const [namePart] = email.split('@');
  return namePart
    .split(/[._-]/)
    .map(str => str.charAt(0).toUpperCase() + str.slice(1))
    .join(' ');
}

const TopNavbar = ({ customTitle }) => {
  const location = useLocation();
  const { email } = useParams(); // <-- Get email from route

  // Determine title based on prop or route
  const getTitle = () => {
    if (customTitle) return customTitle;
    if (location.pathname.includes('/create-campaign')) return 'Create Campaign';
    if (location.pathname.includes('/campaign-details')) return 'Campaign Management';
    return 'Campaign Management'; // Default
  };

  const userName = getNameFromEmail(email);

  return (
    <div className="top-navbar">
      <div className="navbar-content">
        <h1>{getTitle()}</h1>
        <p>
          Hello{userName ? `, ${userName}` : ''} welcome back!
        </p>
      </div>
    </div>
  );
};

export default TopNavbar;
