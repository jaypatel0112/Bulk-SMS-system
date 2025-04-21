import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./CampaignDetails.css";

const CampaignDetails = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [currentPage, setCurrentPage] = useState(1);
  const contactsPerPage = 50;

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/campaign/${id}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      })
      .then((res) => setCampaign(res.data))
      .catch((err) => console.error("Error fetching campaign details", err));
  }, [id]);

  if (!campaign) return <p>Loading...</p>;

  const totalPages = Math.ceil(campaign.contacts.length / contactsPerPage);
  const currentContacts = campaign.contacts.slice(
    (currentPage - 1) * contactsPerPage,
    currentPage * contactsPerPage
  );

  return (
    <div className="campaign-container">
      <h2>📢 Campaign</h2>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={activeTab === "info" ? "active" : ""}
          onClick={() => setActiveTab("info")}
        >
          Campaign Info
        </button>
        <button
          className={activeTab === "contacts" ? "active" : ""}
          onClick={() => setActiveTab("contacts")}
        >
          Contacts
        </button>
      </div>

      {/* Info Tab */}
      {activeTab === "info" && (
        <div className="tab-content">
          <p><strong>Campaign Name:</strong> {campaign.campaign_name}</p>
          <p><strong>Sender Phone Number:</strong> {campaign.sender_phone_number}</p>
          <p><strong>Created At:</strong> {new Date(campaign.created_at).toLocaleString()}</p>
          <p><strong>Message:</strong> {campaign.message_template}</p>
        </div>
      )}

      {/* Contacts Tab */}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ⬅️ Prev
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
