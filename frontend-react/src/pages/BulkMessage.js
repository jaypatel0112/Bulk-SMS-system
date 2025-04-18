import React, { useState } from 'react';
import Papa from 'papaparse';
import './BulkMessage.css'; // Keep using the same styling

const BulkMessage = () => {
  const [fileData, setFileData] = useState([]);
  const [twilioNumber, setTwilioNumber] = useState('');
  const [message, setMessage] = useState('');

  const numbers = [
    { label: 'My Twilio Number', value: '+12183257833' },
    { label: 'Sales Line 💼', value: '+1987654321' },
    { label: 'Marketing Line 🎯', value: '+1122334455' },
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        // Adjust to match CSV format
        const parsedData = results.data.map((row) => ({
          phone_number: row.phone_number,
          first_name: row.first_name,
          last_name: row.last_name,
        }));
        setFileData(parsedData);
      },
    });
  };

  const handleSendMessages = async () => {
    const res = await fetch('http://localhost:5000/api/message/send-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, twilioNumber, contacts: fileData }),
    });

    const data = await res.json();
    alert(data.message);
  };

  return (
    <div className="funky-dashboard">
      <h1>🚀 Funky SMS Dashboard</h1>

      <div className="input-group">
        <label>Select Twilio Number:</label>
        <select value={twilioNumber} onChange={(e) => setTwilioNumber(e.target.value)}>
          <option value="">Choose Number</option>
          {numbers.map(num => (
            <option key={num.value} value={num.value}>{num.label}</option>
          ))}
        </select>
      </div>

      <div className="input-group">
        <label>Upload CSV (phone_number, first_name, last_name):</label>
        <input type="file" accept=".csv" onChange={handleFileUpload} />
      </div>

      <div className="input-group">
        <label>Message (use ${'{first_name}'} & ${'{last_name}'}):</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      <button onClick={handleSendMessages}>📨 Send Bulk SMS</button>
    </div>
  );
};

export default BulkMessage;
