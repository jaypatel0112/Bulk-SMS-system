import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import BulkMessage from './pages/BulkMessage'; // ⬅️ Add this import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bulk-message" element={<BulkMessage />} /> {/* ⬅️ Add this line */}
      </Routes>
    </Router>
  );
}

export default App;
