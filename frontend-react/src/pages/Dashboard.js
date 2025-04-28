import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import './Dashboard.css';

const Dashboard = () => {
  const { email } = useParams();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      const decodedEmail = decodeURIComponent(email);

      try {
        // Fetch campaigns
        const campaignsResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/campaign/${decodedEmail}`,
          {
            headers: {
              'ngrok-skip-browser-warning': 'true',
              'Content-Type': 'application/json',
            },
          }
        );

        const campaignData = Array.isArray(campaignsResponse.data)
          ? campaignsResponse.data
          : campaignsResponse.data?.rows || [];

        setCampaigns(campaignData);
      } catch (err) {
        console.error('Campaigns API Error:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load campaigns');
        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchRole = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/user/role/${encodeURIComponent(email)}`
        );
        if (res.data?.role !== undefined) {
          setRole(res.data.role);
        }
      } catch (err) {
        console.error('Role API Error:', err);
      }
    };

    fetchData();
    fetchRole();
  }, [email, navigate]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your campaigns...</p>
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
          <h1>Your Campaigns</h1>
          <p className="user-email">Logged in as: {decodeURIComponent(email)}</p>
        </header>

        <div className="campaigns-list">
          {campaigns && campaigns.length > 0 ? (
            campaigns.map((campaign) => {
              const campaignId =
                campaign.id || campaign.campaign_id || Math.random().toString(36).substr(2, 9);
              const campaignName = campaign.campaign_name || campaign.name || 'Unnamed Campaign';
              const createdDate = campaign.created_at
                ? new Date(campaign.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Date not available';

              return (
                <div
                  key={campaignId}
                  className="campaign-card"
                  onClick={() =>
                    navigate(`/campaign/${encodeURIComponent(email)}/${campaign.id}`)
                  }
                >
                  <h3>{campaignName}</h3>
                  <p className="campaign-date">Created: {createdDate}</p>
                  {campaign.status && (
                    <p className={`campaign-status ${campaign.status.toLowerCase()}`}>
                      Status: {campaign.status}
                    </p>
                  )}
                </div>
              );
            })
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
