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

const TopNavbar = ({ customTitle, rightContent }) => {
  const location = useLocation();
  const { email } = useParams();

  const getTitle = () => {
    if (customTitle) return customTitle;
    if (location.pathname.includes('/create-campaign')) return 'Create Campaign';
    if (location.pathname.includes('/campaign-details')) return 'Campaign Management';
    return 'Campaign Management';
  };

  const userName = getNameFromEmail(email);

  return (
    <div className="top-navbar">
      <div className="navbar-content">
        <h1>{getTitle()}</h1>
        <p>Hello{userName ? `, ${userName}` : ''} welcome back!</p>
      </div>

      {/* Render the right side content (e.g. your button) */}
      <div className="navbar-right">
        {rightContent}
      </div>
    </div>
  );
};


export default TopNavbar;
