// src/pages/Campaign.js
import React, { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

const Campaign = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [message, setMessage] = useState('');
  const [twilioNumber, setTwilioNumber] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState([]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== 'text/csv') {
      alert('Please upload a valid CSV file.');
      return;
    }
    setCsvFile(file);

    // Parse CSV immediately after selection
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data.map(row => ({
          first_name: row.first_name?.trim(),
          last_name: row.last_name?.trim(),
          phone_number: row.phone_number?.trim()
        }));
        console.log("Parsed contacts:", parsedData);
        setContacts(parsedData);
      },
      error: (err) => {
        alert("Error parsing CSV file.");
        console.error(err);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!csvFile || !message || !twilioNumber || !campaignName || contacts.length === 0) {
      alert("Please fill in all fields and upload a CSV with valid contacts.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      campaign_name: campaignName,
      sender_id: twilioNumber,
      message_template: message,
      contacts
    };

    try {
      const res = await axios.post('http://localhost:5000/api/campaign/upload', payload);
      alert('✅ Campaign launched successfully!');
    } catch (err) {
      console.error(err);
      alert('❌ Error launching campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>📢 Launch SMS Campaign</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Campaign Name:</label><br />
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
          />
        </div>
        <br />
        <div>
          <label>CSV File:</label><br />
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
          />
        </div>
        <br />
        <div>
          <label>Twilio Number:</label><br />
          <input
            type="text"
            value={twilioNumber}
            onChange={(e) => setTwilioNumber(e.target.value)}
          />
        </div>
        <br />
        <div>
          <label>Message:</label><br />
          <textarea
            rows="4"
            cols="50"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi ${first_name}, you're awesome! 🎉"
          ></textarea>
        </div>
        <br />
        <button type="submit" disabled={isSubmitting}>
          🚀 Send Campaign
        </button>
      </form>
      {isSubmitting && <p>Loading...</p>}
    </div>
  );
};

export default Campaign;
