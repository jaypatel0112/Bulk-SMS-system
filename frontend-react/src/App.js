import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Dashboard from './pages/Dashboard'; // ⬅️ Add this import
import Campaign from './pages/Campaign';
import CampaignDetails from './pages/CampaignDetails';
import Inbox from './pages/Inbox';
import Signup from './pages/Signup';
import Login from './pages/Login';  // Import Signup component

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/campaign" element={<Campaign />} />
        <Route path="/campaign/:id" element={<CampaignDetails />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
