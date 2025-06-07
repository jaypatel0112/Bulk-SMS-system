import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './AssignNumber.css'; // Optional external CSS for extra styles

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
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/twilionumber`,
        {
          phone_number: phoneNumber,
          user_id: selectedUserId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

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
    <div className="p-6 max-w-5xl mx-auto bg-white rounded shadow animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Assign Twilio Number</h2>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded"
        >
          ← Back
        </button>
      </div>

      <p className="mb-4 text-sm text-gray-600">Logged in as: <span className="font-medium">{decodeURIComponent(email)}</span></p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Twilio Number</label>
          <input
            type="text"
            placeholder="Enter Twilio Number"
            className="border p-2 w-full rounded"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
          {loading ? (
            <p className="border p-2 rounded bg-gray-100">Loading employees...</p>
          ) : (
            <select
              className="border p-2 w-full rounded"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
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
      </div>

      <button
        onClick={handleAssign}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Assign Number'}
      </button>

      {message && (
        <p
          className={`mt-4 p-2 rounded ${
            message.toLowerCase().includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message}
        </p>
      )}

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Assigned Twilio Numbers</h3>
        {twilioNumbers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-b text-left">Phone Number</th>
                  <th className="py-2 px-4 border-b text-left">Assigned To</th>
                  <th className="py-2 px-4 border-b text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {twilioNumbers.map((number) => (
                  <tr key={`${number.phone_number}-${number.username}`} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{number.phone_number}</td>
                    <td className="py-2 px-4 border-b">{number.username}</td>
                    <td className="py-2 px-4 border-b">
                      <button
                        onClick={() => handleDelete(number.phone_number, number.username)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No Twilio numbers assigned yet.</p>
        )}
      </div>
    </div>
  );
};

export default AssignNumber;
