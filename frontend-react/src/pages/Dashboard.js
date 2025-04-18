// src/pages/Dashboard.js
import React from "react";
import Sidebar from "../components/Sidebar"; // adjust path if needed
import "./Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="content-area">
        <h1>Welcome to the Funky Dashboard 🎉</h1>
        <p>This is your main hub. Use the sidebar to navigate to Bulk Message.</p>
      </div>
    </div>
  );
};

export default Dashboard