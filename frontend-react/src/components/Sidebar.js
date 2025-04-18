import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css"; // Optional if you want to style it

const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2>Menu</h2>
      <ul>
        <li>
          <Link to="/">🏠 Home</Link>
        </li>
        <li>
          <Link to="/bulk-message">📨 Bulk Message</Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
