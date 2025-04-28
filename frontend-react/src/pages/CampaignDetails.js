import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./CampaignDetails.css";

const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [currentPage, setCurrentPage] = useState(1);
  const contactsPerPage = 50;

  // Extract email from URL path (e.g., /dashboard/jp@ptechpartners.com/campaign/123)
  const getEmailFromPath = () => {
    const pathParts = location.pathname.split('/');
    if (pathParts.includes('dashboard') && pathParts.length > 2) {
      return decodeURIComponent(pathParts[2]);
    }
    return null;
  };

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      setError(null);
      const email = getEmailFromPath();

      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/campaign/details/${id}`,
        {
          headers: { "ngrok-skip-browser-warning": "true" },
          params: { email }
        }
      );

      // Basic ownership check (compare with email from URL)
      if (email && res.data.user_email && res.data.user_email !== email) {
        throw new Error("You don't have permission to view this campaign");
      }

      setCampaign(res.data);
    } catch (err) {
      console.error("Error fetching campaign:", err);
      setError(err.response?.data?.error || err.message || "Failed to load campaign");
      
      if (err.message.includes("permission")) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshMessageStatuses = async () => {
    try {
      const email = getEmailFromPath();
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/campaign/details/${id}`,
        {
          headers: { "ngrok-skip-browser-warning": "true" },
          params: { email }
        }
      );
      setCampaign(res.data);
    } catch (err) {
      console.error("Error refreshing campaign:", err);
    }
  };

  const calculateTotal = (report) => {
    const delivered = parseInt(report?.delivered) || 0;
    const failed = parseInt(report?.failed) || 0;
    const queued = parseInt(report?.queued) || 0;
    return delivered + failed + queued;
  };

  useEffect(() => {
    fetchCampaign();
    const interval = setInterval(refreshMessageStatuses, 30000);
    return () => clearInterval(interval);
  }, [id, location.pathname]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading campaign details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-alert">
          <h3>Error Loading Campaign</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
          <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const totalPages = Math.ceil(campaign.contacts.length / contactsPerPage);
  const currentContacts = campaign.contacts.slice(
    (currentPage - 1) * contactsPerPage,
    currentPage * contactsPerPage
  );

  return (
    <div className="campaign-container">
      <div className="campaign-header">
        <h2>📢 Campaign: {campaign.campaign_name}</h2>
        {campaign.user_email && (
          <p className="owner-badge">Owner: {campaign.user_email}</p>
        )}
      </div>

      <div className="tabs">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Campaign Overview
        </button>
        <button
          className={activeTab === "contacts" ? "active" : ""}
          onClick={() => setActiveTab("contacts")}
        >
          Contacts ({campaign.contacts.length})
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="tab-content">
          <div className="overview-grid">
            <div className="campaign-info">
              <h3>Campaign Information</h3>
              <div className="info-box">
                <p><strong>Campaign Name:</strong> {campaign.campaign_name}</p>
                <p><strong>Sender Phone:</strong> {campaign.sender_phone_number}</p>
                <p><strong>Created At:</strong> {new Date(campaign.created_at).toLocaleString()}</p>
                <p><strong>Message:</strong> {campaign.message_template}</p>
              </div>
            </div>

            <div className="campaign-report">
              <h3>📊 Delivery Report</h3>
              <div className="stats-grid">
                <div className="stat-box">
                  <span className="stat-label">Total Messages</span>
                  <span className="stat-value">{calculateTotal(campaign.report)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Delivered</span>
                  <span className="stat-value">{campaign.report?.delivered || 0}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Failed</span>
                  <span className="stat-value">{campaign.report?.failed || 0}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Queued</span>
                  <span className="stat-value">{campaign.report?.queued || 0}</span>
                </div>
              </div>

              <button onClick={refreshMessageStatuses} className="refresh-button">
                🔄 Refresh Status
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "contacts" && (
        <div className="tab-content">
          <div className="contacts-header">
            <h3>Contact List</h3>
            <div className="contacts-count">
              Showing {currentContacts.length} of {campaign.contacts.length} contacts
            </div>
          </div>
          
          <div className="table-container">
            <table className="contacts-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Phone Number</th>
                </tr>
              </thead>
              <tbody>
                {currentContacts.map((contact, idx) => (
                  <tr key={idx}>
                    <td>{(currentPage - 1) * contactsPerPage + idx + 1}</td>
                    <td>{contact.first_name || '-'}</td>
                    <td>{contact.last_name || '-'}</td>
                    <td>{contact.phone_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ⬅️ Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next ➡️
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CampaignDetails;