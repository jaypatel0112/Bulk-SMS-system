import { Box } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useHomeStyles from '../styles/HomeStyles';

const Sidebar = ({ email }) => {
  const classes = useHomeStyles();
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [selectedBox, setSelectedBox] = useState('Dashboard');

  // Extract email from prop or URL
  const getEmail = () => {
    if (email) return email;
    const pathParts = location.pathname.split('/');
    // Look for 'dashboard', 'campaign', 'inbox', or 'assign-number'
    const keywords = ['dashboard', 'campaign', 'inbox', 'assign-number'];
    for (let key of keywords) {
      const idx = pathParts.indexOf(key);
      if (idx !== -1 && pathParts.length > idx + 1) {
        return decodeURIComponent(pathParts[idx + 1]);
      }
    }
    return '';
  };

  const currentEmail = getEmail();

  // Fetch user role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/api/user/role/${encodeURIComponent(currentEmail)}`,
        );
        const data = await res.json();
        if (data.role !== undefined) {
          setRole(data.role);
          // console.log('Fetched role:', data.role);
        }
      } catch (err) {
        console.error('Failed to fetch role:', err);
      }
    };
    if (currentEmail) fetchRole();
  }, [currentEmail]);

  // Highlight selected menu based on path
  useEffect(() => {
    if (location.pathname.includes('campaign')) {
      setSelectedBox('Create Campaign');
    } else if (location.pathname.includes('inbox')) {
      setSelectedBox('Inbox');
    } else if (location.pathname.includes('assign-number')) {
      setSelectedBox('Assign Number');
    } else {
      setSelectedBox('Dashboard');
    }
  }, [location.pathname]);

  // Navigation handler
  const handleBoxClick = (path) => {
    navigate(path);
  };

  // Menu items
  const menuItems = [
    { 
      name: 'Dashboard', 
      path: `/dashboard/${encodeURIComponent(currentEmail)}`,
      icon: '🏠'
    },
    { 
      name: 'Create Campaign', 
      path: `/campaign/${encodeURIComponent(currentEmail)}`,
      icon: '📨'
    },
    { 
      name: 'Inbox', 
      path: `/inbox/${encodeURIComponent(currentEmail)}`,
      icon: '💬'
    }
  ];

  if (role === 1) {
    menuItems.push({
      name: 'Assign Number',
      path: `/assign-number/${encodeURIComponent(currentEmail)}`,
      icon: '📱'
    });
  }

  return (
    <Box className={classes.leftDiv}>
      <Box className={classes.logoBox}>
        <img
          className={classes.ptpLogo}
          src={require('../bgImages/PndGlogo.png')}
          alt="PTP Logo"
        />
      </Box>
      <Box className={classes.leftPanelBelowLogo}>
        <Box className={classes.leftPanelOptions}>
          {menuItems.map((item, index) => (
            <Box
              key={item.name}
              className={`${classes.LeftPanelBox} ${selectedBox === item.name ? classes.selectedBox : ''} ${index === 0 ? classes.firstMenuItem : ''}`}
              onClick={() => handleBoxClick(item.path)}
              sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Box className={classes.LeftPanelImgContainer}>
                <span style={{ fontSize: '1.25vw' }}>{item.icon}</span>
              </Box>
              <p className={classes.LeftPanelText}>
                {item.name}
              </p>
            </Box>
          ))}
        </Box>
        
      </Box>
    </Box>
  );
};

export default Sidebar;
