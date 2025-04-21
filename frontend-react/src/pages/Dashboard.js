// src/pages/Dashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";

const API_URL = process.env.REACT_APP_API_URL;

const Dashboard = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/campaign`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      })
      .then((res) => setCampaigns(res.data))
      .catch((err) => console.error("Error fetching campaigns", err));
  }, []);

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h2>📣 Campaigns</h2>
        </div>

        <div className="dashboard-content">
          <div className="campaigns-container">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="campaign-card"
                onClick={() => navigate(`/campaign/${camp.id}`)}
              >
                <h3>{camp.campaign_name}</h3>

                <small>📅 Created: {new Date(camp.created_at).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
