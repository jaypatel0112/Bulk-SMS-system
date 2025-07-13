import axios from "axios";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import card1 from '../bgImages/Card_1.png';
import card2 from '../bgImages/Card_2.png';
import card3 from '../bgImages/Card_3.png';
import Sidebar from "../components/Sidebar"; // <-- Adjusted import path
import TopNavbar from '../components/TopNavbar';
import "./CampaignDetails.css";


const CampaignDetails = () => {
  const { email } = useParams()
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusNumbers, setStatusNumbers] = useState({
    type: null,
    numbers: [],
    loading: false,
    error: null
  });
  const [statusCounts, setStatusCounts] = useState({
    delivered: 0,
    failed: 0,
    queued: 0,
    replies: 0
  });
  const contactsPerPage = 50;
  const statusTypeToBg = {
  delivered: card2,
  failed: card3,
  queued: card1,
  replied: card2, // or whichever image you want for replies
  total: card1,
};


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
        { params: { email } }
      );

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

  const fetchStatusCounts = async () => {
    const statuses = ['delivered', 'failed', 'queued'];
    const counts = {};

    for (const status of statuses) {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/campaign/status-numbers/${id}`,
          { params: { status } }
        );
        counts[status] = res.data.numbers?.length || 0;
      } catch (err) {
        console.error(`Error fetching count for ${status}:`, err);
        counts[status] = 0;
      }
    }

    // Fetch replies count
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/campaign/replies-count/${id}`
      );
      counts.replies = res.data.replies || 0;
    } catch (err) {
      console.error("Error fetching replies count:", err);
      counts.replies = 0;
    }

    setStatusCounts(counts);
  };

  const fetchStatusNumbers = async (statusType) => {
    try {
      setStatusNumbers(prev => ({
        ...prev,
        type: statusType,
        loading: true,
        error: null,
        numbers: []
      }));

      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/campaign/status-numbers/${id}`,
        { params: { status: statusType } }
      );

      setStatusNumbers(prev => ({
        ...prev,
        numbers: res.data.numbers || [],
        loading: false
      }));
    } catch (err) {
      console.error(`Error fetching ${statusType} numbers:`, err);
      setStatusNumbers(prev => ({
        ...prev,
        error: err.response?.data?.error || err.message || `Failed to load ${statusType} numbers`,
        loading: false
      }));
    }
  };

  const fetchRepliedNumbers = async () => {
    try {
      setStatusNumbers(prev => ({
        ...prev,
        type: 'replied',
        loading: true,
        error: null,
        numbers: []
      }));

      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/campaign/replied-numbers/${id}`
      );

      setStatusNumbers(prev => ({
        ...prev,
        numbers: res.data.numbers || [],
        loading: false
      }));
    } catch (err) {
      console.error("Error fetching replied numbers:", err);
      setStatusNumbers(prev => ({
        ...prev,
        error: err.response?.data?.error || err.message || "Failed to load replied numbers",
        loading: false
      }));
    }
  };

  const refreshMessageStatuses = async () => {
    try {
      const email = getEmailFromPath();
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/campaign/details/${id}`,
        { params: { email } }
      );
      setCampaign(res.data);
    } catch (err) {
      console.error("Error refreshing campaign:", err);
    }
  };

  const calculateTotal = (counts) => {
    const delivered = parseInt(counts?.delivered) || 0;
    const failed = parseInt(counts?.failed) || 0;
    const queued = parseInt(counts?.queued) || 0;
    return delivered + failed + queued;
  };

  const closeStatusNumbers = () => {
    setStatusNumbers({
      type: null,
      numbers: [],
      loading: false,
      error: null
    });
  };

  useEffect(() => {
    fetchCampaign();
    fetchStatusCounts();

    const interval = setInterval(() => {
      refreshMessageStatuses();
      fetchStatusCounts();
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [id, location.pathname]);

  if (loading) {
  return (
    <div className="loading-container">
      <div className="loading-center-content">
        <div className="spinner"></div>
        <p>Loading campaign details...</p>
      </div>
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
    <div className="campaign-details-layout">
      {/* Sidebar on the left */}
      <Sidebar email={decodeURIComponent(email)} />
      <div className="main-content-area">
        <TopNavbar customTitle="Campaign Detail" />
      {/* Main content on the right */}
        <div className="campaign-container">

          {/* Campaign Details Header */}
          <div className="campaign-details-header">
            <div className="header-content">
              <div className="title-section">
                <h2>Campaign: {campaign.campaign_name}</h2>
                {campaign.user_email && (
                  <p className="owner-badge"> Created by: {campaign.user_email}</p>
                )}
              </div>
              <button className="back-button" onClick={() => navigate(-1)}>
                ← Back
              </button>
            </div>
          

            {/* Modal for status numbers */}
            {statusNumbers.type && (
              <div className="status-numbers-modal">
                <div className="status-numbers-content"
                  style={{
                    backgroundImage: `url(${card2})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right bottom',
                    backgroundSize: 'cover'
                  }}>
                  <div className="status-numbers-header"
                    style={{
                      backgroundImage: `url(${card2})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right bottom',
                      backgroundSize: 'cover',
                      backgroundColor: 'transparent'
                    }}>
                    <h3>
                      {statusNumbers.type.charAt(0).toUpperCase() + statusNumbers.type.slice(1)} Numbers
                    </h3>
                    <button className="close-btn" onClick={closeStatusNumbers} aria-label="Close">
                      ×
                    </button>
                  </div>
                  {statusNumbers.loading ? (
                    <div className="loading-container">
                      <div className="spinner"></div>
                      <p>Loading {statusNumbers.type} numbers...</p>
                    </div>
                  ) : statusNumbers.error ? (
                    <div className="error-message">
                      {statusNumbers.error}
                      <button onClick={() => statusNumbers.type === 'replied' ? fetchRepliedNumbers() : fetchStatusNumbers(statusNumbers.type)}>
                        Retry
                      </button>
                    </div>
                  ) : (
                    <div className="numbers-list-container">
                      <p className="count-info">Total: {statusNumbers.numbers.length} numbers</p>
                      <div className="numbers-list">
                        {statusNumbers.numbers.map((number, index) => (
                          <div key={index} className="number-item">
                            {number}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Tabs Wrapper */}
            <div className="tabs-wrapper">
              {/* Tabs */}
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

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === "overview" && (
                  <div className="overview-container">
                    <div className="overview-content">
                      <div className="campaign-info">
                        <h3>Campaign Information</h3>
                        <div className="info-details">
                          <p><strong>Campaign Name:</strong> {campaign.campaign_name}</p>
                          <p><strong>Sender Phone:</strong> {campaign.sender_phone_number}</p>
                          <p><strong>Created At:</strong> {new Date(campaign.created_at).toLocaleString()}</p>
                          <p><strong>Message:</strong> {campaign.message_template}</p>
                        </div>
                      </div>

                      <div className="campaign-report">
                        <div className="report-header-row">
                          <h3>Delivery Report</h3>
                          <button
                            onClick={() => {
                              refreshMessageStatuses();
                              fetchStatusCounts();
                            }}
                            className="refresh-button"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M4 4V9H4.58152M4.58152 9C5.24618 7.35652 6.43937 5.97687 8.01849 5.08658C9.59761 4.19629 11.4637 3.85519 13.2825 4.11025C15.1014 4.36531 16.7705 5.19885 18.0284 6.48178C19.2863 7.76471 20.0617 9.43163 20.2393 11.2329M20 20V15H19.4185M19.4185 15C18.7538 16.6435 17.5606 18.0231 15.9815 18.9134C14.4024 19.8037 12.5363 20.1448 10.7175 19.8898C8.89856 19.6347 7.22951 18.8012 5.97161 17.5182C4.71371 16.2353 3.93834 14.5684 3.76071 12.7671"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Refresh Status
                          </button>
                        </div>

                        <div className="stats-grid-compact">
                          <div className="stat-box-compact total-messages-bg">
                            <div className="stat-content">
                              <span className="stat-label">Total Messages</span>
                              <span className="stat-value">{calculateTotal(statusCounts)}</span>
                            </div>
                          </div>

                          <div className="stat-box-compact clickable delivered-bg" onClick={() => fetchStatusNumbers('delivered')}>
                            <div className="stat-content">
                              <span className="stat-label">Delivered</span>
                              <span className="stat-value">{statusCounts.delivered}</span>
                            </div>
                          </div>

                          <div className="stat-box-compact clickable failed-bg" onClick={() => fetchStatusNumbers('failed')}>
                            <div className="stat-content">
                              <span className="stat-label">Failed</span>
                              <span className="stat-value">{statusCounts.failed}</span>
                            </div>
                          </div>

                          <div className="stat-box-compact clickable queued-bg" onClick={() => fetchStatusNumbers('queued')}>
                            <div className="stat-content">
                              <span className="stat-label">Queued</span>
                              <span className="stat-value">{statusCounts.queued}</span>
                            </div>
                          </div>

                          <div className="stat-box-compact clickable replies-bg" onClick={() => fetchRepliedNumbers()}>
                            <div className="stat-content">
                              <span className="stat-label">Replies</span>
                              <span className="stat-value">{statusCounts.replies}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "contacts" && (
                  <div>
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
                          className="pagination-btn"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          <span className="arrow arrow-left">←</span>
                          Previous
                        </button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button
                          className="pagination-btn"
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <span className="arrow arrow-right">→</span>
                        </button>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetails;
