import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import './Dashboard.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Dashboard = () => {
  const { email } = useParams();
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      const decodedEmail = decodeURIComponent(email);

      try {
        const roleRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/user/role/${encodeURIComponent(decodedEmail)}`
        );

        if (roleRes.data?.role !== undefined) {
          setRole(roleRes.data.role);

          if (roleRes.data.role === 1) {
            try {
              const regularUsersRes = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/user/role/2/all`
              );

              const allUsers = [
                {
                  user_id: 'admin',
                  email: decodedEmail,
                  isAdmin: true,
                },
                ...regularUsersRes.data.map(user => ({
                  ...user,
                  isAdmin: false,
                })),
              ];

              setUsers(allUsers);
              setCampaigns([]);
            } catch (err) {
              console.error('Error fetching users:', err);
              setUsers([
                {
                  user_id: 'admin',
                  email: decodedEmail,
                  isAdmin: true,
                },
              ]);
            }
          } else {
            const campaignsResponse = await axios.get(
              `${process.env.REACT_APP_API_URL}/api/campaign/${decodedEmail}`
            );

            const campaignData = Array.isArray(campaignsResponse.data)
              ? campaignsResponse.data
              : campaignsResponse.data?.rows || [];

            setCampaigns(campaignData);
          }
        }
      } catch (err) {
        console.error('API Error:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load data');
        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [email, navigate]);

  const handleUserClick = async (userEmail) => {
    try {
      setLoading(true);
      const campaignsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/campaign/${userEmail}`
      );

      const campaignData = Array.isArray(campaignsResponse.data)
        ? campaignsResponse.data
        : campaignsResponse.data?.rows || [];

      setCampaigns(campaignData);
      setSelectedUser(userEmail);
    } catch (err) {
      console.error('Campaigns API Error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load user campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
    setCampaigns([]);
  };

  const handleDeleteUser = async (userEmail) => {
    if (!window.confirm(`Are you sure you want to permanently delete user ${userEmail}? This cannot be undone.`)) {
      return;
    }

    setDeletingUser(userEmail);

    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/user/${encodeURIComponent(userEmail)}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          data: {
            adminEmail: decodeURIComponent(email)
          }
        }
      );

      const updatedUsers = users.filter(user => user.email !== userEmail);
      setUsers(updatedUsers);

      if (selectedUser === userEmail) {
        handleBackToUsers();
      }

      toast.success(`User ${userEmail} deleted successfully`);
    } catch (err) {
      console.error('Delete user error:', err);
      const errorMessage = err.response?.data?.error ||
        err.response?.data?.details ||
        err.message ||
        'Failed to delete user';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setDeletingUser(null);
    }
  };

  const handleLogout = () => {
    // Clear any local/session storage if used
    // localStorage.clear();
    // sessionStorage.clear();

    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar email={decodeURIComponent(email)} role={role} />

      <div className="dashboard-main">
        <header className="dashboard-header">
          <h1>
            {role === 1
              ? selectedUser
                ? `Campaigns by ${selectedUser}`
                : 'All Users'
              : 'Your Campaigns'}
          </h1>
          <div className="header-actions">
            {role === 1 && selectedUser && (
              <button onClick={handleBackToUsers} className="back-button">
                Back to Users
              </button>
            )}
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
          <p className="user-email">Logged in as: {decodeURIComponent(email)}</p>
        </header>

        <div className={role === 1 && !selectedUser ? 'users-list' : 'campaigns-list'}>
          {role === 1 ? (
            selectedUser ? (
              campaigns.length > 0 ? (
                campaigns.map((campaign) => (
                  <div
                    key={campaign.id || campaign.campaign_id}
                    className="campaign-card"
                    onClick={() =>
                      navigate(`/campaign/${encodeURIComponent(email)}/${campaign.id}`)
                    }
                  >
                    <h3>{campaign.campaign_name || campaign.name || 'Unnamed Campaign'}</h3>
                    <p className="campaign-date">
                      Created:{' '}
                      {campaign.created_at
                        ? new Date(campaign.created_at).toLocaleDateString()
                        : 'Date not available'}
                    </p>
                    {campaign.status && (
                      <p className={`campaign-status ${campaign.status.toLowerCase()}`}>
                        Status: {campaign.status}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-campaigns">
                  <img src="/empty-state.svg" alt="No campaigns" className="empty-icon" />
                  <h3>No campaigns found for this user</h3>
                </div>
              )
            ) : users.length > 0 ? (
              users.map((user) => (
                <div
                  key={user.user_id}
                  className={`user-card ${user.isAdmin ? 'admin-user' : ''}`}
                >
                  <div className="user-card-content" onClick={() => handleUserClick(user.email)}>
                    <h3>{user.email}</h3>
                    <p className="user-role">
                      Role: {user.isAdmin ? 'Administrator' : 'Standard User'}
                      {user.isAdmin && <span className="admin-badge">Admin</span>}
                    </p>
                  </div>
                  {!user.isAdmin && (
                    <button
                      className="delete-user-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUser(user.email);
                      }}
                      disabled={deletingUser === user.email}
                    >
                      {deletingUser === user.email ? 'Deleting...' : 'Delete User'}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="no-users">
                <img src="/empty-state.svg" alt="No users" className="empty-icon" />
                <h3>No users found</h3>
              </div>
            )
          ) : campaigns.length > 0 ? (
            campaigns.map((campaign) => (
              <div
                key={campaign.id || campaign.campaign_id}
                className="campaign-card"
                onClick={() =>
                  navigate(`/campaign/${encodeURIComponent(email)}/${campaign.id}`)
                }
              >
                <h3>{campaign.campaign_name || campaign.name || 'Unnamed Campaign'}</h3>
                <p className="campaign-date">
                  Created:{' '}
                  {campaign.created_at
                    ? new Date(campaign.created_at).toLocaleDateString()
                    : 'Date not available'}
                </p>
                {campaign.status && (
                  <p className={`campaign-status ${campaign.status.toLowerCase()}`}>
                    Status: {campaign.status}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="no-campaigns">
              <img src="/empty-state.svg" alt="No campaigns" className="empty-icon" />
              <h3>No campaigns found</h3>
              <p>You haven't created any campaigns yet</p>
              <button
                onClick={() => navigate(`/campaign/${encodeURIComponent(email)}`)}
                className="create-button"
              >
                Create New Campaign
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
