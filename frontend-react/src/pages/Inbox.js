import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";
import "./Inbox.css";

const API_URL = process.env.REACT_APP_API_URL;

const optOutKeywords = [
  "stop", "stopall", "unsubscribe", "cancel", "quit", "end"
];

function isOptOutMessage(message) {
  if (!message?.body) return false;
  const body = message.body.toLowerCase().trim();
  return optOutKeywords.includes(body);
}

function isBulkStopMessage(message) {
  if (!message?.body) return false;
  return message.body.trim().toLowerCase().endsWith("stop to opt out.");
}

const fetchLatestCampaignForNumber = async (twilio_number, contact_phone) => {
  try {
    const response = await axios.get(`${API_URL}/api/campaign/latestcampaign`, {
      params: { 
        twilio_number, 
        contact_phone 
      }
    });
    if (Array.isArray(response.data)) {
      return response.data.length > 0 ? response.data[0].campaign_name : null;
    }
    return response.data?.campaign_name || null;
  } catch (error) {
    console.error('Error fetching latest campaign:', error);
    return null;
  }
};

const Inbox = () => {
  const { email } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const [sortOption, setSortOption] = useState(
    localStorage.getItem('inboxSortOption') || 'newest'
  );
  const bottomRef = useRef(null);
  const conversationsRef = useRef([]);
  const selectedConversationRef = useRef(null);
  const lastOpenedRef = useRef({});

  useEffect(() => {
    const saved = localStorage.getItem('conversationLastOpened');
    lastOpenedRef.current = saved ? JSON.parse(saved) : {};
  }, []);

  useEffect(() => {
    conversationsRef.current = conversations;
    selectedConversationRef.current = selectedConversation;
  }, [conversations, selectedConversation]);

  const formatContactName = (conv) => {
    if (conv.contact_display) return conv.contact_display;
    if (conv.contact_first_name || conv.contact_last_name)
      return `${conv.contact_first_name || ''} ${conv.contact_last_name || ''}`.trim();
    return conv.contact_phone || "";
  };

  const markConversationAsRead = useCallback((twilio_number, contact_phone) => {
    const key = `${twilio_number}-${contact_phone}`;
    lastOpenedRef.current[key] = Date.now();
    localStorage.setItem('conversationLastOpened', JSON.stringify(lastOpenedRef.current));
    setConversations(prev => prev.map(conv =>
      conv.twilio_number === twilio_number && conv.contact_phone === contact_phone
        ? { ...conv, has_unread: false }
        : conv
    ));
    setSelectedConversation(prev =>
      prev && prev.twilio_number === twilio_number && prev.contact_phone === contact_phone
        ? { ...prev, has_unread: false }
        : prev
    );
  }, []);

  const handleSortChange = (e) => {
    const value = e.target.value;
    setSortOption(value);
    localStorage.setItem('inboxSortOption', value);
  };

  const fetchConversations = useCallback(async (silent = false) => {
    try {
      const decodedEmail = decodeURIComponent(email);
      const response = await axios.get(`${API_URL}/api/inbox/${decodedEmail}`);

      let newConversations = response.data
        .map(conv => {
          const key = `${conv.twilio_number}-${conv.contact_phone}`;
          const lastRealMsg = [...(conv.messages || [])]
            .reverse()
            .find(msg => !isOptOutMessage(msg) && !isBulkStopMessage(msg));
          const newestMessageTime = lastRealMsg
            ? new Date(lastRealMsg.timestamp).getTime()
            : 0;
          const has_unread = lastOpenedRef.current[key]
            ? newestMessageTime > lastOpenedRef.current[key]
            : !!lastRealMsg;
          return {
            ...conv,
            messages: conv.messages || [],
            has_unread,
            display_name: formatContactName(conv)
          };
        })
        .filter(conv =>
          conv.messages.some(
            msg => !isOptOutMessage(msg) && !isBulkStopMessage(msg)
          )
        )
        .sort((a, b) => {
          if (sortOption === 'unread') {
            if (a.has_unread && !b.has_unread) return -1;
            if (!a.has_unread && b.has_unread) return 1;
          }
          const aLast = a.messages[a.messages.length - 1]?.timestamp || a.created_at;
          const bLast = b.messages[b.messages.length - 1]?.timestamp || b.created_at;
          return new Date(bLast) - new Date(aLast);
        });

      if (!silent) {
        const prevConversations = conversationsRef.current;
        const hasNewMessages = newConversations.some(newConv => {
          const prevConv = prevConversations.find(c => 
            c.twilio_number === newConv.twilio_number && 
            c.contact_phone === newConv.contact_phone
          );
          return (!prevConv && newConv.messages.length > 0) ||
                 (prevConv && newConv.messages.length > prevConv.messages.length);
        });

        if (hasNewMessages) {
          setNewMessageAlert(true);
          setTimeout(() => setNewMessageAlert(false), 3000);
        }
      }

      setConversations(newConversations);
      setError(null);

      const prevSelected = selectedConversationRef.current;
      if (prevSelected) {
        const updatedConv = newConversations.find(c => 
          c.twilio_number === prevSelected.twilio_number && 
          c.contact_phone === prevSelected.contact_phone
        );
        if (!updatedConv) {
          setSelectedConversation(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      setError("Failed to load conversations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, sortOption]);

  useEffect(() => {
    fetchConversations();
  }, [sortOption, fetchConversations]);

  const handleConversationSelect = useCallback(async (conversation) => {
    setSelectedConversation(conversation);
    markConversationAsRead(conversation.twilio_number, conversation.contact_phone);

    const campaign = await fetchLatestCampaignForNumber(
      conversation.twilio_number,
      conversation.contact_phone
    );
    setSelectedConversation(prev => ({
      ...prev,
      latest_campaign_name: campaign
    }));
  }, [markConversationAsRead]);

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;
    try {
      const decodedEmail = decodeURIComponent(email);
      await axios.post(`${API_URL}/api/message/reply`, {
        to: selectedConversation.contact_phone,
        from: selectedConversation.twilio_number,
        body: replyText,
        direction: "outbound",
        email: decodedEmail,
      });

      const newMessage = {
        id: Date.now().toString(),
        body: replyText,
        direction: "outbound",
        timestamp: new Date().toISOString()
      };
      setSelectedConversation(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage]
      }));

      setConversations(prev =>
        prev.map(conv =>
          conv.twilio_number === selectedConversation.twilio_number &&
          conv.contact_phone === selectedConversation.contact_phone
            ? {
                ...conv,
                messages: [...conv.messages, newMessage],
                last_message: replyText,
                last_message_at: new Date().toISOString()
              }
            : conv
        )
      );

      setReplyText("");
      setSuccess("Message sent successfully!");
      setTimeout(() => setSuccess(null), 3000);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      setTimeout(() => fetchConversations(true), 1000);
    } catch (err) {
      console.error("Failed to send reply:", err);
      setError("Failed to send message. Please try again.");
    }
  };

  useEffect(() => {
    if (!email) {
      navigate("/login");
      return;
    }
    fetchConversations();
    const interval = setInterval(() => fetchConversations(), 10000);
    return () => clearInterval(interval);
  }, [email, fetchConversations, navigate]);

  useEffect(() => {
    if (selectedConversation?.messages?.length) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [selectedConversation]);

  const formatMessageDate = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar email={decodeURIComponent(email)} />
        <div className="dashboard-main">
          <div className="loading-spinner">Loading conversations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <Sidebar email={decodeURIComponent(email)} />
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h2>💬 Inbox ({decodeURIComponent(email)})</h2>
          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}
          {newMessageAlert}
        </div>
        <div className="inbox-container">
          <div className="inbox-sidebar">
            <div className="sidebar-header">
              <h3>Conversations ({conversations.length})</h3>
              <div className="filter-controls">
                <select
                  className="message-filter"
                  onChange={handleSortChange}
                  value={sortOption}
                >
                  <option value="newest">Newest First</option>
                  <option value="unread">Unread First</option>
                </select>
              </div>
            </div>
            {conversations.length === 0 ? (
              <p className="no-conversations">No conversations found</p>
            ) : (
              <div className="conversation-list">
                {conversations.map((conv, idx) => {
                  const lastRelevantMessage = [...conv.messages]
                    .reverse()
                    .find(msg => !isOptOutMessage(msg) && !isBulkStopMessage(msg));
                  return (
                    <div
                      key={conv.twilio_number + conv.contact_phone + idx}
                      className={`conversation-item ${
                        selectedConversation?.twilio_number === conv.twilio_number &&
                        selectedConversation?.contact_phone === conv.contact_phone
                          ? "active"
                          : ""
                      } ${conv.has_unread ? "unread" : ""} ${
                        sortOption === 'unread' && conv.has_unread ? "highlight-unread" : ""
                      }`}
                      onClick={() => handleConversationSelect(conv)}
                    >
                      <div className="conversation-header">
                        <span className="contact-name">
                          {conv.display_name}
                          {conv.has_unread && <span className="unread-badge">●</span>}
                        </span>
                        <span className="conversation-time">
                          {lastRelevantMessage
                            ? formatMessageDate(lastRelevantMessage.timestamp)
                            : formatMessageDate(conv.created_at)}
                        </span>
                      </div>
                      <p className="message-preview">
                        {lastRelevantMessage
                          ? lastRelevantMessage.body.substring(0, 50) + 
                            (lastRelevantMessage.body.length > 50 ? "..." : "")
                          : "New conversation"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="inbox-chat">
            {selectedConversation ? (
              <>
                <div className="chat-header">
                  <div>
                    <h3>
                      {selectedConversation.display_name}
                      {selectedConversation.latest_campaign_name && (
                        <span className="campaign-name">
                          <span className="separator">|</span>
                          <span className="campaign-text">Last Campaign: {selectedConversation.latest_campaign_name}</span>
                        </span>
                      )}
                    </h3>
                    <div className="conversation-meta">
                      <span>{selectedConversation.contact_phone}</span>
                      {selectedConversation.twilio_number && (
                        <span> from {selectedConversation.twilio_number}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="chat-messages">
                  {selectedConversation.messages
                    .filter(msg => !isOptOutMessage(msg) && !isBulkStopMessage(msg))
                    .reduce((acc, msg, index, array) => {
                      const currentDate = formatMessageDate(msg.timestamp);
                      const prevDate = index > 0 ? formatMessageDate(array[index - 1].timestamp) : null;
                      
                      if (currentDate !== prevDate) {
                        acc.push(
                          <div key={`date-${msg.timestamp}`} className="message-date-separator">
                            {currentDate}
                          </div>
                        );
                      }
                      
                      acc.push(
                        <div
                          key={msg.id || msg.timestamp}
                          className={`message-wrapper ${
                            msg.direction === "outbound" ? "align-right" : "align-left"
                          }`}
                        >
                          <div
                            className={`message-bubble ${
                              msg.direction === "outbound" ? "sent" : "received"
                            }`}
                          >
                            {msg.body}
                            <span className="message-time">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                      
                      return acc;
                    }, [])}
                  <div ref={bottomRef} />
                </div>
                <div className="chat-input">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={2}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                  <button
                    className="send-button"
                    onClick={sendReply}
                    disabled={!replyText.trim()}
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="no-conversation-selected">
                <p>Select a conversation to view messages.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;