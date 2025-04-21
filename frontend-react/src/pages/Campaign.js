import React, { useState, useRef } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import Sidebar from '../components/Sidebar';
import './Campaign.css';

const Campaign = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [message, setMessage] = useState('');
  const [twilioNumber, setTwilioNumber] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const messageRef = useRef(null);

  const twilioNumbers = [
    { number: '+12244452202', label: 'Primary Number' },
    { number: '+19876543210', label: 'Backup Number' },
    { number: '+11234567890', label: 'Marketing Line' },
  ];

  const MAX_CHAR_LIMIT = 160;
  const RESERVED_STOP_LENGTH = 20;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== 'text/csv') {
      alert('Please upload a valid CSV file.');
      return;
    }

    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data.map(row => ({
          first_name: row.first_name?.trim(),
          last_name: row.last_name?.trim(),
          phone_number: row.phone_number?.trim()
        }));
        const headers = Object.keys(results.data[0] || {});
        setCsvHeaders(headers);
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

    const STOP_TEXT = ' STOP to opt out.';
    const updatedMessage = message + STOP_TEXT;
    if (!csvFile || !updatedMessage || !twilioNumber || !campaignName || contacts.length === 0) {
      alert("Please fill in all fields and upload a CSV with valid contacts.");
      return;
    }

    if (message.length > MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH) {
      alert(`Message too long! Max allowed is ${MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      campaign_name: campaignName,
      sender_id: twilioNumber,
      message_template: updatedMessage,
      contacts,
      scheduled_at: scheduledAt || null
    };

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/campaign/upload`, payload, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      alert('✅ Campaign launched successfully!');
    } catch (err) {
      console.error(err);
      alert('❌ Error launching campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInsertVariable = (variable) => {
    const cursorPos = messageRef.current.selectionStart;
    const newMessage =
      message.substring(0, cursorPos) +
      `\${${variable}}` +
      message.substring(cursorPos);
    setMessage(newMessage);
    setShowVars(false);

    setTimeout(() => {
      messageRef.current.focus();
      messageRef.current.selectionStart = cursorPos + variable.length + 3;
      messageRef.current.selectionEnd = cursorPos + variable.length + 3;
    }, 0);
  };

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h2>📢 Launch SMS Campaign</h2>
        </div>
        <div className="dashboard-content">
          <form onSubmit={handleSubmit} className="campaign-form">
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
              <label>Schedule Time (optional):</label><br />
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
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
              <select
                value={twilioNumber}
                onChange={(e) => setTwilioNumber(e.target.value)}
              >
                <option value="">Select a Twilio Number</option>
                {twilioNumbers.map((twilio) => (
                  <option key={twilio.number} value={twilio.number}>
                    {twilio.label} ({twilio.number})
                  </option>
                ))}
              </select>
            </div>
            <br />

            <div style={{ position: 'relative' }}>
              <label>Message:</label><br />
              <textarea
                ref={messageRef}
                rows="4"
                cols="50"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi ${first_name}, you're awesome! 🎉"
                maxLength={MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH}
              ></textarea>
              <div style={{ fontSize: '12px', color: 'gray' }}>
                {message.length}/{MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH} (Final STOP message will be auto-added)
              </div>

              {csvHeaders.length > 0 && (
                <div style={{ marginTop: '5px' }}>
                  <button
                    type="button"
                    onClick={() => setShowVars(!showVars)}
                  >
                    {showVars ? 'Hide Fields' : '{...}'}
                  </button>
                  {showVars && (
                    <ul className="vars-dropdown">
                      {csvHeaders.map((header) => (
                        <li key={header} onClick={() => handleInsertVariable(header)}>
                          {header}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <br />

            <div>
              <button type="submit" disabled={isSubmitting}>
                🚀 Send Campaign
              </button>
              <button
                type="button"
                style={{ marginLeft: '10px' }}
                onClick={() => setShowPreview(true)}
              >
                👁️ Preview
              </button>
            </div>
            {isSubmitting && <p>Loading...</p>}
          </form>
        </div>
      </div>

      {showPreview && (
        <div className="preview-modal">
          <div className="preview-content">
            <h3>📤 Message Preview</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>
              {message}  
              <br /><br />
              <em style={{ color: 'gray' }}>STOP to opt out.</em>
            </p>
            <button onClick={() => setShowPreview(false)}>❌ Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaign;
