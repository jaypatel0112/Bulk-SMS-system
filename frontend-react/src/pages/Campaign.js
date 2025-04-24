// ✅ FRONTEND - Campaign.js

import React, { useState, useRef } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { ToastContainer, toast } from 'react-toastify';
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
  const [feedbackMsg, setFeedbackMsg] = useState(null);
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
    if (!file) return;
    if (file.type !== 'text/csv') {
      setFeedbackMsg({ type: 'error', text: 'Please upload a valid CSV file.' });
      return;
    }

    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = Object.keys(results.data[0] || {});
        const normalizedData = results.data.map((row) => {
          const normalized = {};
          headers.forEach(h => {
            const key = h.trim().toLowerCase().replace(/\s+/g, '_');
            normalized[key] = row[h]?.trim();
          });
          return normalized;
        });

        setCsvHeaders(headers);
        setContacts(normalizedData);
        setFeedbackMsg({ type: 'success', text: 'CSV file loaded successfully.' });
      },
      error: (err) => {
        setFeedbackMsg({ type: 'error', text: 'Error parsing CSV file.' });
        console.error(err);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const STOP_TEXT = ' STOP to opt out.';
    const updatedMessage = message + STOP_TEXT;

    if (!csvFile || !updatedMessage || !twilioNumber || !campaignName || contacts.length === 0) {
      toast.error('Please fill in all fields and upload a CSV with valid contacts.', {
        position: "top-right",
        autoClose: 5000,
      });
      return;
    }

    if (message.length > MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH) {
      toast.error(`Message too long! Max allowed is ${MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH} characters.`, {
        position: "top-right",
        autoClose: 5000,
      });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    const payload = {
      campaign_name: campaignName,
      sender_id: twilioNumber,
      message_template: updatedMessage,
      contacts,
      scheduled_at: scheduledAt || null
    };

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/campaign/upload`, payload);
      toast.success('🚀 Campaign launched successfully!', {
        position: "top-right",
        autoClose: 5000,
      });
      // Clear form after successful submission
      setCampaignName('');
      setMessage('');
      setCsvFile(null);
      setContacts([]);
      setCsvHeaders([]);
    } catch (err) {
      console.error(err);
      toast.error('Campaign launch failed. Please try again.', {
        position: "top-right",
        autoClose: 5000,
      });
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
            {/* Left Section - Campaign Details */}
            <div className="form-left-section">
              <div className="form-group">
                <label>Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Schedule Time (optional)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Sender Number</label>
                <select
                  value={twilioNumber}
                  onChange={(e) => setTwilioNumber(e.target.value)}
                  required
                >
                  <option value="">Select a Twilio Number</option>
                  {twilioNumbers.map((twilio) => (
                    <option key={twilio.number} value={twilio.number}>
                      {twilio.label} ({twilio.number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group message-section">
                <label>Message Content</label>
                <div className="message-input-container">
                  <textarea
                    ref={messageRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hi ${first_name}, you're awesome! 🎉"
                    maxLength={MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH}
                    required
                  />
                  <div className="message-controls">
                    <div className="char-counter">
                      {message.length}/{MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH}
                      <span className="stop-text">STOP message will be auto-added</span>
                    </div>
                    {csvHeaders.length > 0 && (
                      <button
                        type="button"
                        className="vars-button"
                        onClick={() => setShowVars(!showVars)}
                      >
                        {showVars ? '✕ Hide Variables' : '+ Insert Variables'}
                      </button>
                    )}
                  </div>
                  {showVars && (
                    <ul className="vars-dropdown">
                      {csvHeaders.map((header) => (
                        <li key={header} onClick={() => handleInsertVariable(header)}>
                          ${header}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section - File Upload */}
            <div className="form-right-section">
              <div className="file-upload-container">
                <label>Contact List (CSV)</label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    id="file-input"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="file-input" className="file-upload-label">
                    <div className="upload-content">
                      <span className="upload-icon">📄</span>
                      <span className="upload-text">
                        {csvFile ? csvFile.name : 'Drop your CSV file here'}
                      </span>
                      <span className="upload-hint">or click to browse</span>
                    </div>
                  </label>
                </div>
                {contacts.length > 0 && (
                  <div className="contacts-preview">
                    <div className="contacts-count">
                      ✅ {contacts.length} contacts loaded
                    </div>
                  </div>
                )}
              </div>

              <div className="action-buttons">
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '🔄 Sending...' : '🚀 Launch Campaign'}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowPreview(true)}
                >
                  👁️ Preview Message
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="preview-modal" onClick={() => setShowPreview(false)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <h3>📱 Message Preview</h3>
            <div className="preview-message">
              <p>{message}</p>
              <em>STOP to opt out.</em>
            </div>
            <button className="button button-secondary" onClick={() => setShowPreview(false)}>
              Close Preview
            </button>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default Campaign;
