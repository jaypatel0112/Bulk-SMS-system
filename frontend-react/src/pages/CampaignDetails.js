import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./CampaignDetails.css";

const CampaignDetails = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [currentPage, setCurrentPage] = useState(1);
  const contactsPerPage = 50;

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/campaign/${id}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      console.log('Campaign Response:', res.data); // Add this line to inspect the response
      setCampaign(res.data);
    } catch (err) {
      console.error("Error fetching campaign details", err);
    }
  };

  const refreshMessageStatuses = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/campaign/${id}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      setCampaign(res.data);
    } catch (err) {
      console.error("Error refreshing campaign details", err);
    }
  };

  const updateCampaignStats = async () => {
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/campaign/update/${id}`,
        {
          status: "completed",
          message: "delivered",
        },
        {
          headers: { "ngrok-skip-browser-warning": "true" },
        }
      );
      console.log("Campaign updated:", res.data);
      refreshMessageStatuses();
    } catch (err) {
      console.error("Error updating campaign:", err);
    }
  };

  const calculateTotal = (report) => {
    // Convert string values to numbers and handle undefined/null cases
    const delivered = parseInt(report?.delivered) || 0;
    const failed = parseInt(report?.failed) || 0;
    const queued = parseInt(report?.queued) || 0;
    
    // Calculate total
    const total = delivered + failed + queued;
    
    // Debug log to verify values
    console.log('Report values:', {
      delivered,
      failed,
      queued,
      total
    });
    
    return total;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refreshMessageStatuses();
    }, 30000);

    return () => clearInterval(interval);
  }, [campaign]);

  if (!campaign) return <p>Loading...</p>;

  const totalPages = Math.ceil(campaign.contacts.length / contactsPerPage);
  const currentContacts = campaign.contacts.slice(
    (currentPage - 1) * contactsPerPage,
    currentPage * contactsPerPage
  );

  return (
    <div className="campaign-container">
      <h2>📢 Campaign</h2>

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
          Contacts
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="tab-content">
          <div className="overview-grid">
            <div className="campaign-info">
              <h3>Campaign Information</h3>
              <div className="info-box">
                <p><strong>Campaign Name:</strong> {campaign.campaign_name}</p>
                <p><strong>Sender Phone Number:</strong> {campaign.sender_phone_number}</p>
                <p><strong>Created At:</strong> {new Date(campaign.created_at).toLocaleString()}</p>
                <p><strong>Message:</strong> {campaign.message_template}</p>
              </div>
            </div>

            <div className="campaign-report">
              <h3>📊 Delivery Report</h3>
              <div className="stats-grid">
                <div className="stat-box">
                  <span className="stat-label">Total Messages</span>
                  <span className="stat-value">
                    {calculateTotal(campaign.report)}
                  </span>
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
                🔄 Refresh Message Statuses
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "contacts" && (
        <div className="tab-content">
          <h4>Contacts ({campaign.contacts.length})</h4>
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
                  <td>{contact.first_name}</td>
                  <td>{contact.last_name}</td>
                  <td>{contact.phone_number}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ⬅️ Prev
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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