import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import AssignNumber from './pages/AssignNumber';
import Campaign from './pages/Campaign';
import CampaignDetails from './pages/CampaignDetails';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Login from './pages/Login';
import Signup from './pages/Signup';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Dashboard route with email parameter */}
        <Route path="/dashboard/:email" element={<Dashboard />} />
        
        {/* Campaign routes with email parameter */}
        <Route path="/campaign/:email" element={<Campaign />} />
        <Route path="bulksms/campaign/:email/:id" element={<CampaignDetails />} />
        <Route path="/assign-number/:email" element={<AssignNumber />} />
        <Route path="/inbox/:email" element={<Inbox />} /><Route path="/inbox/:email" element={<Inbox />} />
        
        {/* Root redirect */}
        <Route path="/" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;