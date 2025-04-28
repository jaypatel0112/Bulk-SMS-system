import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Papa from 'papaparse';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from '../components/Sidebar';
import './Campaign.css';

const Campaign = () => {
  const { email } = useParams();
  const navigate = useNavigate();
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
  const [userRole, setUserRole] = useState(null);
  const [assignedNumbers, setAssignedNumbers] = useState([]);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const messageRef = useRef(null);

  const MAX_CHAR_LIMIT = 160;
  const RESERVED_STOP_LENGTH = 20;

  useEffect(() => {
    if (!email) {
      navigate('/login');
    } else {
      fetchUserData();
    }
  }, [email, navigate]);

  const fetchUserData = async () => {
    setIsLoadingUserData(true);
    try {
      // First get user role
      const roleResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/user/role/${encodeURIComponent(email)}`,
        {
          headers: { "ngrok-skip-browser-warning": "true" },
          params: { email }
        }
      );

      const role = roleResponse.data.role;

    // If role is 1 (admin) or user_id is null (admin condition), show the textbox
    if (role === 1 || roleResponse.data.user_id === null) {
      setUserRole('admin');
    } else {
      setUserRole('user');
    }

    // Get assigned numbers for non-admin users
    if (role !== 1) {
      const numbersResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/twilio-numbers/user-numbers/${encodeURIComponent(email)}`,
        {
          headers: { "ngrok-skip-browser-warning": "true" },
          params: { email }
        }
      );

      // Handle both response formats
      let numbers = [];

      if (Array.isArray(numbersResponse.data.numbers)) {
        numbers = numbersResponse.data.numbers;
      } else if (Array.isArray(numbersResponse.data)) {
        numbers = numbersResponse.data;
      }

      setAssignedNumbers(numbers);
      
      // Auto-select the first number if available
      if (numbers.length > 0) {
        setTwilioNumber(numbers[0]);
      }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user information');
    } finally {
      setIsLoadingUserData(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'text/csv') {
      setFeedbackMsg({ type: 'error', text: 'Please upload a valid CSV file.' });
      return;
    }

    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = Object.keys(results.data[0] || {});
        const normalized = results.data.map(row => {
          const obj = {};
          headers.forEach(h => {
            const key = h.trim().toLowerCase().replace(/\s+/g, '_');
            obj[key] = row[h]?.trim();
          });
          return obj;
        });
        setCsvHeaders(headers);
        setContacts(normalized);
        setFeedbackMsg({ type: 'success', text: 'CSV file loaded successfully.' });
      },
      error: (err) => {
        setFeedbackMsg({ type: 'error', text: 'Error parsing CSV file.' });
        console.error(err);
      }
    });
  };

  const handleInsertVariable = (variable) => {
    const cursorPos = messageRef.current.selectionStart;
    const newMessage = `${message.slice(0, cursorPos)}\${${variable}}${message.slice(cursorPos)}`;
    setMessage(newMessage);
    setShowVars(false);

    setTimeout(() => {
      messageRef.current.focus();
      messageRef.current.selectionStart = cursorPos + variable.length + 3;
      messageRef.current.selectionEnd = cursorPos + variable.length + 3;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const STOP_TEXT = ' STOP to opt out.';
    const updatedMessage = message + STOP_TEXT;

    if (!csvFile || !updatedMessage || !twilioNumber || !campaignName || contacts.length === 0) {
      toast.error('Please fill in all fields and upload a CSV with valid contacts.');
      return;
    }

    if (message.length > MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH) {
      toast.error(`Message too long! Max allowed is ${MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);
    const payload = {
      campaign_name: campaignName,
      sender_id: twilioNumber,
      message_template: updatedMessage,
      contacts,
      scheduled_at: scheduledAt || null,
      user_email: decodeURIComponent(email),
      user_role: userRole
    };

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/campaign/upload`, payload);
      toast.success('🚀 Campaign launched successfully!');
      setTimeout(() => {
        navigate(`/dashboard/${email}`);
      }, 2000);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Campaign launch failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSenderNumberInput = () => {
    if (isLoadingUserData) {
      return <div className="loading-numbers">Loading sender options...</div>;
    }

    if (userRole === 'admin') {
      return (
        <input
          type="text"
          value={twilioNumber}
          onChange={(e) => setTwilioNumber(e.target.value)}
          placeholder="Enter any Twilio number (e.g., +12223334444)"
          required
          className="form-control"
        />
      );
    }

    if (assignedNumbers.length > 0) {
      return (
        <select
          value={twilioNumber}
          onChange={(e) => setTwilioNumber(e.target.value)}
          required
          className="form-control"
        >
          {assignedNumbers.map((number, index) => (
            <option key={index} value={number}>
              {number}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value="No numbers assigned - contact admin"
        disabled
        className="form-control disabled-input"
      />
    );
  };

  return (
    <div className="dashboard-wrapper">
      <Sidebar email={decodeURIComponent(email)} />
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h2>📢 Launch SMS Campaign</h2>
          <p className="user-email">Logged in as: {decodeURIComponent(email)}</p>
          {userRole && (
            <p className="user-role">Role: {userRole === 'admin' ? 'Administrator' : 'Standard User'}</p>
          )}
        </div>
        <div className="dashboard-content">
          <form onSubmit={handleSubmit} className="campaign-form">
            {/* Left Section */}
            <div className="form-left-section">
              <div className="form-group">
                <label>Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name"
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Schedule Time (optional)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Sender Number</label>
                {renderSenderNumberInput()}
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
                    className="form-control"
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
                      {csvHeaders.map(header => (
                        <li key={header} onClick={() => handleInsertVariable(header)}>
                          ${header}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section */}
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
                  disabled={isSubmitting || (userRole !== 'admin' && assignedNumbers.length === 0)}
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

      {/* Message Preview Modal */}
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