import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Dashboard from './pages/Dashboard';// ⬅️ Add this import
import Campaign from './pages/Campaign';
import CampaignDetails from './pages/CampaignDetails';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/campaign" element={<Campaign />} />
        <Route path="/campaign/:id" element={<CampaignDetails />} /> 
      </Routes>
    </Router>
  );
}

export default App;
