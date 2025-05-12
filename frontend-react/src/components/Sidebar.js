import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ email }) => {
  const location = useLocation();
  const [role, setRole] = useState(null);

  const getEmail = () => {
    if (email) return email;
    const pathParts = location.pathname.split('/');
    const dashboardIndex = pathParts.indexOf('dashboard');
    if (dashboardIndex !== -1 && pathParts.length > dashboardIndex + 1) {
      return decodeURIComponent(pathParts[dashboardIndex + 1]);
    }
    return '';
  };

  const currentEmail = getEmail();

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/api/user/role/${encodeURIComponent(currentEmail)}`,
          {
            params: { email }
          }
        );
        const data = await res.json();
        if (data.role !== undefined) {
          setRole(data.role);
          console.log('Fetched role:', data.role);  // <-- add this line
        }
      } catch (err) {
        console.error('Failed to fetch role:', err);
      }
    };

    if (currentEmail) {
      fetchRole();
    }
  }, [currentEmail]);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>📊 Menu</h2>
        {currentEmail && <p className="user-email">{currentEmail}</p>}
      </div>
      <ul className="sidebar-nav">
        <li>
          <Link to={`/dashboard/${encodeURIComponent(currentEmail)}`}>🏠 Dashboard</Link>
        </li>
        <li>
          <Link to={`/campaign/${encodeURIComponent(currentEmail)}`}>📨 Create Campaign</Link>
        </li>
        <li>
          <Link to={`/inbox/${encodeURIComponent(currentEmail)}`}>💬 Inbox</Link>
        </li>
        {role === 1 && (
          <li>
            <Link to={`/assign-number/${encodeURIComponent(currentEmail)}`}>📱 Assign Number</Link>
          </li>
        )}
      </ul>
    </div>
  );
};

export default Sidebar;
