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
  const [sentMessages, setSentMessages] = useState(0);
  const [incomingMessages, setIncomingMessages] = useState(0);
  const [optOuts, setOptOuts] = useState(0);
  const [filterStatus, setFilterStatus] = useState('All');
  const [timeFilter, setTimeFilter] = useState('24h');

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
              setCampaigns([]); // Start with empty campaigns (User Management view)
            } catch (err) {
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const params = {
          email: decodeURIComponent(email),
          role,
          selectedUser: selectedUser || null,
          timeFilter
        };

        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/campaign/dashboard-stats`,
          { params }
        );

        setSentMessages(res.data.sentMessages || 0);
        setIncomingMessages(res.data.incomingMessages || 0);
        setOptOuts(res.data.optOutCount || 0);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setSentMessages(0);
        setIncomingMessages(0);
        setOptOuts(0);
      }
    };

    if (email && role !== null) {
      fetchStats();
    }
  }, [email, role, selectedUser, timeFilter]);

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
      setFilterStatus('All');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load user campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAdminCampaigns = async () => {
    try {
      setLoading(true);
      const campaignsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/campaign/${decodeURIComponent(email)}`
      );

      const campaignData = Array.isArray(campaignsResponse.data)
        ? campaignsResponse.data
        : campaignsResponse.data?.rows || [];

      setCampaigns(campaignData);
      setSelectedUser(email);
      setFilterStatus('All');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load admin campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
    setCampaigns([]);
    setFilterStatus('All');
  };

  const handleDeleteUser = async (userEmail) => {
    if (!window.confirm(`Are you sure you want to permanently delete user ${userEmail}?`)) {
      return;
    }

    setDeletingUser(userEmail);

    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/user/${encodeURIComponent(userEmail)}`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: { adminEmail: decodeURIComponent(email) }
        }
      );

      const updatedUsers = users.filter(user => user.email !== userEmail);
      setUsers(updatedUsers);

      if (selectedUser === userEmail) {
        handleBackToUsers();
      }

      toast.success(`User ${userEmail} deleted successfully`);
    } catch (err) {
      toast.error(`Error: ${err.response?.data?.error || 'Failed to delete user'}`);
    } finally {
      setDeletingUser(null);
    }
  };

  const handleLogout = () => {
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
        <button onClick={() => window.location.reload()} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  const filteredCampaigns = filterStatus === 'All'
    ? campaigns
    : campaigns.filter((c) =>
        (c.status || '').toLowerCase() === filterStatus.toLowerCase()
      );

  return (
    <div className="dashboard-container">
      <Sidebar email={decodeURIComponent(email)} role={role} />

      <div className="dashboard-main">
        <div className="stats-section">
          <h2>Message Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{sentMessages.toLocaleString()}</div>
              <div className="stat-label">Messages Sent</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{incomingMessages.toLocaleString()}</div>
              <div className="stat-label">Incoming Messages</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{optOuts.toLocaleString()}</div>
              <div className="stat-label">Opt-Outs</div>
            </div>
          </div>
        </div>

        <header className="dashboard-header">
          <h1>
            {role === 1
              ? selectedUser
                ? `Campaigns by ${selectedUser === email ? 'You' : selectedUser}`
                : 'User Management'
              : 'Your Campaigns'}
          </h1>
          <div className="header-actions">
            {role !== 1 && campaigns.length > 0 && (
              <select
                className="filter-dropdown"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Completed">Completed</option>
              </select>
            )}

            <select
              className="time-filter-dropdown"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="1h">Last 1 hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>

            {role === 1 && selectedUser && (
              <button onClick={handleBackToUsers} className="back-button">
                Back to Users
              </button>
            )}

            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </header>

        <div className={role === 1 && !selectedUser ? 'users-list' : 'campaigns-list'}>
          {role === 1 ? (
            selectedUser ? (
              filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign) => (
                  <div
                    key={campaign.id || campaign.campaign_id}
                    className="campaign-card"
                    onClick={() => navigate(`/campaign/${encodeURIComponent(email)}/${campaign.id}`)}
                  >
                    <h3>{campaign.campaign_name || campaign.name || 'Unnamed Campaign'}</h3>
                    <p>Created: {new Date(campaign.created_at).toLocaleDateString()}</p>
                    {campaign.status && (
                      <p className={`status-${campaign.status.toLowerCase()}`}>
                        {campaign.status}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>No campaigns found for this user</p>
                </div>
              )
            ) : users.length > 0 ? (
              users.map((user) => (
                <div key={user.user_id} className={`user-card ${user.isAdmin ? 'admin' : ''}`}>
                  <div 
                    className="user-info" 
                    onClick={() => user.isAdmin ? handleViewAdminCampaigns() : handleUserClick(user.email)}
                    style={{ cursor: 'pointer' }}
                  >
                    <h3>{user.email} {user.isAdmin && '(You)'}</h3>
                    <p>{user.isAdmin ? 'Administrator' : 'Standard User'}</p>
                  </div>
                  {!user.isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUser(user.email);
                      }}
                      disabled={deletingUser === user.email}
                      className="delete-btn"
                    >
                      {deletingUser === user.email ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No users found</p>
              </div>
            )
          ) : filteredCampaigns.length > 0 ? (
            filteredCampaigns.map((campaign) => (
              <div
                key={campaign.id || campaign.campaign_id}
                className="campaign-card"
                onClick={() => navigate(`/campaign/${encodeURIComponent(email)}/${campaign.id}`)}
              >
                <h3>{campaign.campaign_name || campaign.name || 'Unnamed Campaign'}</h3>
                <p>Created: {new Date(campaign.created_at).toLocaleDateString()}</p>
                {campaign.status && (
                  <p className={`status-${campaign.status.toLowerCase()}`}>
                    {campaign.status}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No campaigns found</p>
              <button
                onClick={() => navigate(`/campaign/${encodeURIComponent(email)}`)}
                className="create-btn"
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