import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    // Replace with your local URL
    axios.get("http://localhost:5000/api/campaign")
      .then((res) => setCampaigns(res.data))
      .catch((err) => console.error("Error fetching campaigns", err));
  }, []);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="content-area">
        <h1>Welcome to the Funky Dashboard 🎉</h1>
        <p>Your sent campaigns:</p>
        {campaigns.map((camp) => (
          <div 
            key={camp.id}
            className="campaign-card"
            onClick={() => navigate(`/campaign/${camp.id}`)}
            style={{
              cursor: "pointer",
              padding: "1rem",
              border: "1px solid #ccc",
              borderRadius: "10px",
              marginBottom: "1rem",
              backgroundColor: "#f7f7f7"
            }}
          >
            <h3>{camp.campaign_name}</h3>
            <p>Sender: {camp.sender_id}</p>
            <small>Click for details ➡️</small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
