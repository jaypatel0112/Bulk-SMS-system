import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import './AssignNumber.css';

const AssignNumber = () => {
  const { email } = useParams();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [twilioNumbers, setTwilioNumbers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-hide message after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 4000); // 4 seconds

      return () => clearTimeout(timer); // Cleanup timer on component unmount or message change
    }
  }, [message]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, numberRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/user/role/2/all`),
        axios.get(`${process.env.REACT_APP_API_URL}/api/twilionumber`),
      ]);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setTwilioNumbers(Array.isArray(numberRes.data) ? numberRes.data : []);
    } catch (err) {
      console.error(err);
      setMessage('Error fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId || !phoneNumber) {
      setMessage('Please select user and enter phone number.');
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${process.env.REACT_APP_API_URL}/api/twilionumber`, {
        phone_number: phoneNumber,
        user_id: selectedUserId,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setMessage('Twilio number assigned successfully!');
      setPhoneNumber('');
      setSelectedUserId('');
      fetchData();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to assign Twilio number.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (phone_number, username) => {
    if (!window.confirm(`Are you sure you want to remove ${phone_number} from ${username}?`)) return;
    try {
      setLoading(true);
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/twilionumber`, {
        data: { phone_number, username },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setMessage('Twilio number deleted successfully!');
      fetchData();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to delete number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Sidebar email={decodeURIComponent(email)} />
      <div className="dashboard-main-assign">
        <TopNavbar customTitle="Assign Twilio Number" />
        <div className="assign-container">
          <div className="assign-content">
            {/* Left Column - Assign Form */}
            <div className="assign-form-section">
              <h2>Assign a Number</h2>
              <div className="form-container-assign">
                {/* Twilio Number - Inline */}
                <div className="form-field-inline">
                  <label>Twilio Number</label>
                  <input
                    type="text"
                    placeholder="Enter Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="form-input-assign"
                  />
                </div>
                
                {/* Employee - Inline */}
                <div className="form-field-inline">
                  <label>Employee</label>
                  {loading ? (
                    <div className="loading-select">Loading employees...</div>
                  ) : (
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="form-select-assign"
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp.user_id} value={emp.user_id}>
                          {emp.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                {/* Assign Button */}
                <button
                  onClick={handleAssign}
                  className="assign-btn"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Assign'}
                </button>
                
                {message && (
                  <div className={`message ${message.toLowerCase().includes('success') ? 'success' : 'error'}`}>
                    {message}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Assigned Numbers Table */}
            <div className="assigned-numbers-section">
              <h2>Assigned Numbers</h2>
              <div className="table-container-assign">
                <table className="assigned-table">
                  <thead>
                    <tr>
                      <th>Phone Number</th>
                      <th>Assigned To</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {twilioNumbers.length > 0 ? (
                      twilioNumbers.map((number) => (
                        <tr key={`${number.phone_number}-${number.username}`}>
                          <td className="phone-number">{number.phone_number}</td>
                          <td className="assigned-email">{number.username || '-'}</td>
                          <td className="actions-cell">
                            <button
                              onClick={() => handleDelete(number.phone_number, number.username)}
                              className="delete-btn"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="no-data">
                          No Twilio numbers assigned yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignNumber;