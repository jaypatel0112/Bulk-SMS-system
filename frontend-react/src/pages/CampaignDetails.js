import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const CampaignDetails = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/campaign/${id}`)
      .then(res => setCampaign(res.data))
      .catch(err => console.error("Error fetching campaign details", err));
  }, [id]);

  if (!campaign) return <p>Loading...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📢 Campaign Details</h2>
      <p><strong>Campaign Name:</strong> {campaign.campaign_name}</p>
      <p><strong>Sender Phone Number:</strong> {campaign.sender_phone_number}</p>
      <p><strong>Created At:</strong> {new Date(campaign.created_at).toLocaleString()}</p>

      <p><strong>Message:</strong> {campaign.message_template}</p>

      <h4>Contacts:</h4>
      <ul>
        {campaign.contacts.length > 0 ? (
          campaign.contacts.map((contact, idx) => (
            <li key={idx}>
              <strong>{contact.first_name} {contact.last_name}</strong> - {contact.phone_number}
            </li>
          ))
        ) : (
          <li>No contacts available for this campaign.</li>
        )}
      </ul>
    </div>
  );
};

export default CampaignDetails;
