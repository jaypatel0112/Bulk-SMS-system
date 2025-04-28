import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Campaign from './pages/Campaign';
import CampaignDetails from './pages/CampaignDetails';
import Inbox from './pages/Inbox';
import Signup from './pages/Signup';
import Login from './pages/Login';
import AssignNumber from './pages/AssignNumber'

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
        <Route path="/campaign/:email/:id" element={<CampaignDetails />} />
        <Route path="/assign-number/:email" element={<AssignNumber />} />
        <Route path="/inbox/:email" element={<Inbox />} /><Route path="/inbox/:email" element={<Inbox />} />
        
        {/* Root redirect */}
        <Route path="/" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;