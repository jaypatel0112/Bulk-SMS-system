import axios from 'axios';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import './Inbox.css';

const API_URL = process.env.REACT_APP_API_URL;
const optOutKeywords = ["stop", "stopall", "unsubscribe", "cancel", "quit", "end"];

function isOptOutMessage(message) {
  if (!message?.body) return false;
  const body = message.body.toLowerCase().trim();
  return optOutKeywords.includes(body);
}

function isBulkStopMessage(message) {
  if (!message?.body) return false;
  return message.body.trim().toLowerCase().endsWith("stop to opt out.");
}

const Inbox = () => {
  const { email } = useParams();
  const navigate = useNavigate();

  // State declarations
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const [sortOption, setSortOption] = useState(localStorage.getItem("inboxSortOption") || "newest");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Refs
  const bottomRef = useRef(null);
  const conversationListRef = useRef(null);
  const conversationsRef = useRef([]);
  const selectedConversationRef = useRef(null);

  // New Message Modal State
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMsgTo, setNewMsgTo] = useState("");
  const [newMsgBody, setNewMsgBody] = useState("");
  const [newMsgLoading, setNewMsgLoading] = useState(false);
  const [newMsgError, setNewMsgError] = useState(null);
  const [twilioNumber, setTwilioNumber] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [assignedNumbers, setAssignedNumbers] = useState([]);
  const [allNumbers, setAllNumbers] = useState([]);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);

  // Update refs when state changes
  useEffect(() => {
    conversationsRef.current = conversations;
    selectedConversationRef.current = selectedConversation;
  }, [conversations, selectedConversation]);

  // Utility functions
  const formatContactName = (conv) => {
    if (conv.contact_display) return conv.contact_display;
    if (conv.contact_first_name || conv.contact_last_name)
      return `${conv.contact_first_name || ""} ${conv.contact_last_name || ""}`.trim();
    return conv.contact_phone || "";
  };

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return "";
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  // API functions
  const markConversationAsRead = useCallback(
    async (twilio_number, contact_phone) => {
      try {
        const response = await axios.post(`${API_URL}/api/message/mark-conversation-read`, {
          twilio_number,
          contact_phone,
          email: decodeURIComponent(email),
        });
        if (response.data.success) {
          setConversations((prev) =>
            prev.map((conv) =>
              conv.twilio_number === twilio_number && conv.contact_phone === contact_phone
                ? { ...conv, has_unread: false }
                : conv,
            ),
          );
          setSelectedConversation((prev) =>
            prev && prev.twilio_number === twilio_number && prev.contact_phone === contact_phone
              ? { ...prev, has_unread: false }
              : prev,
          );
        }
      } catch (error) {
        console.error("Error marking conversation as read:", error);
        setError("Failed to mark conversation as read. Please try again.");
      }
    },
    [email],
  );

  const fetchConversations = useCallback(async (loadMore = false, cursorArg = null) => {
    try {
      if (loadMore) {
        if (!hasMore || isFetchingMore) return;
        setIsFetchingMore(true);
      } else {
        setLoading(true);
      }
  
      const decodedEmail = decodeURIComponent(email);
      const url = `${API_URL}/api/inbox/${decodedEmail}${cursorArg ? `?cursor=${encodeURIComponent(cursorArg)}` : ''}`;
  
      const response = await axios.get(url);
      const data = response.data;
  
      const receivedConversations = Array.isArray(data?.conversations) 
        ? data.conversations 
        : Array.isArray(data) ? data : [];
  
      if (loadMore) {
        // Combine old + new
        const combined = [...conversationsRef.current, ...receivedConversations];

        // Remove duplicates by unique key
        const uniqueMap = new Map();
        combined.forEach(conv => {
          const key = `${conv.id}-${conv.twilio_number}-${conv.contact_phone}`;
          uniqueMap.set(key, conv);
        });

        // Convert map to array and sort by last_message_at descending
        let uniqueList = Array.from(uniqueMap.values()).sort((a, b) =>
          new Date(b.last_message_at) - new Date(a.last_message_at)
        );

        // Trim the oldest if exceeding limit (e.g., max 100)
        const MAX_CONVERSATIONS = 100;
        if (uniqueList.length > MAX_CONVERSATIONS) {
          uniqueList = uniqueList.slice(0, MAX_CONVERSATIONS);
        }

        setConversations(uniqueList);

      } else {
        setConversations(receivedConversations);
      }
  
      setCursor(data?.next_cursor || null);
      setHasMore(data?.has_more || false);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      setError("Failed to load conversations. Please try again.");
      setConversations([]);
    } finally {
      if (loadMore) {
        setIsFetchingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [email, hasMore, isFetchingMore, API_URL]);
  
  

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (!conversationListRef.current || !hasMore || isFetchingMore) return;
      const { scrollTop, scrollHeight, clientHeight } = conversationListRef.current;
      if (scrollHeight - (scrollTop + clientHeight) < 100) {
        fetchConversations(true, cursor);
      }
    };
  
    const listElement = conversationListRef.current;
    if (listElement) {
      listElement.addEventListener('scroll', handleScroll);
      return () => listElement.removeEventListener('scroll', handleScroll);
    }
  }, [fetchConversations, hasMore, isFetchingMore, cursor]);

  // Initial fetch
  useEffect(() => {
    if (!email) {
      navigate("/login");
      return;
    }
    fetchConversations();
    const interval = setInterval(() => fetchConversations(true), 10000);
    return () => clearInterval(interval);
  }, [email, navigate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (selectedConversation?.messages?.length) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [selectedConversation]);

  // Fetch user data for new message modal
  useEffect(() => {
    if (!showNewMessageModal) return;

    const fetchUserAndNumbers = async () => {
      setIsLoadingUserData(true);
      try {
        const roleResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/user/role/${encodeURIComponent(email)}`,
          { params: { email } },
        );
        const role = roleResponse.data.role;

        if (role === 1 || roleResponse.data.user_id === null) {
          setUserRole("admin");
          const allNumbersResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/twilionumber`);
          const uniqueNumbers = Array.from(new Set((allNumbersResponse.data || []).map((n) => n.phone_number)));
          setAllNumbers(uniqueNumbers);
          if (uniqueNumbers.length > 0) setTwilioNumber(uniqueNumbers[0]);
        } else {
          setUserRole("user");
          const numbersResponse = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/twilio-numbers/user-numbers/${encodeURIComponent(email)}`,
            { params: { email } },
          );
          let numbers = [];
          if (Array.isArray(numbersResponse.data.numbers)) {
            numbers = numbersResponse.data.numbers;
          } else if (Array.isArray(numbersResponse.data)) {
            numbers = numbersResponse.data;
          }
          setAssignedNumbers(numbers);
          if (numbers.length > 0) setTwilioNumber(numbers[0]);
        }
      } catch (error) {
        setAllNumbers([]);
        setAssignedNumbers([]);
        setTwilioNumber("");
      } finally {
        setIsLoadingUserData(false);
      }
    };

    fetchUserAndNumbers();
  }, [showNewMessageModal, email]);

  useEffect(() => {
    if (!selectedConversation?.twilio_number || !selectedConversation?.contact_phone) return;
  
    axios.get(`${API_URL}/api/campaign/latestcampaign`, {
      params: {
        twilio_number: selectedConversation.twilio_number,
        contact_phone: selectedConversation.contact_phone,
      },
    })
    .then(res => {
      const campaignName = res.data.campaign_name;
      console.log("Campaign API response:", res.data);
  
      if (campaignName) {
        setSelectedConversation(prev => ({
          ...prev,
          latest_campaign_name: campaignName,
        }));
      } else {
        setSelectedConversation(prev => ({
          ...prev,
          latest_campaign_name: null,
        }));
      }
    })
    .catch(err => {
      console.error("Failed to fetch campaign name:", err);
    });
  }, [selectedConversation?.twilio_number, selectedConversation?.contact_phone]);
  
  
  
  

  // Filtered conversations
  const filteredConversations = conversations
  .filter((conv) => {
    if (filter === "unread") return conv.has_unread;
    return true;
  })
  .filter((conv) => (conv.contact_display || "").toLowerCase().includes(search.toLowerCase()));

  const handleConversationSelect = (conv) => {
    const latest = conversations.find(
      c =>
        c.id === conv.id &&
        c.twilio_number === conv.twilio_number &&
        c.contact_phone === conv.contact_phone
    );
  
    const conversationToSelect = latest || conv;
    
    console.log("Selected conversation full data:", conversationToSelect);
  
    if (conversationToSelect.has_unread) {
      markConversationAsRead(conversationToSelect.twilio_number, conversationToSelect.contact_phone);
    }
  
    setSelectedConversation(conversationToSelect);
  };
  


  // Loading state
  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar email={decodeURIComponent(email)} />
        <div className="inbox-dashboard-main">
          <TopNavbar
            customTitle="Inbox"
            rightContent={
              <>
                {error && <div className="error-banner">{error}</div>}
                {success && <div className="success-banner">{success}</div>}
                {newMessageAlert && (
                  <div className="new-message-alert" onClick={() => setNewMessageAlert(false)}>
                    New messages received!
                  </div>
                )}
                <button className="new-message-btn" onClick={() => setShowNewMessageModal(true)} title="Send a new message">
                  New Message
                </button>
              </>
            }
          />
          <div className="loading-overlay">
            <div className="loading-center-content">
              <div className="spinner"></div>
              <div className="loading-text">Loading conversations...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <Sidebar email={decodeURIComponent(email)} />
      <div className="inbox-dashboard-main">
        <TopNavbar
          customTitle="Inbox"
          rightContent={
            <button className="new-message-btn" onClick={() => setShowNewMessageModal(true)} title="Send a new message">
              New Message
            </button>
          }
        />

        <div className="dashboard-content-wrapper">
          <div className="inbox-container">
            {/* Sidebar */}
            <div className="inbox-sidebar">
              <div className="sidebar-header">
                <h3>Conversations</h3>
                <div className="filter-controls">
                  <input
                    className="conversation-search"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button className={`pill-btn${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
                    All
                  </button>
                  <button
                    className={`pill-btn${filter === "unread" ? " active" : ""}`}
                    onClick={() => setFilter("unread")}
                  >
                    Unread
                  </button>
                  <select className="conversation-dropdown" onChange={(e) => {
                    setSortOption(e.target.value);
                    localStorage.setItem("inboxSortOption", e.target.value);
                  }} value={sortOption}>
                    <option value="newest">Newest</option>
                    <option value="unread">Unread</option>
                  </select>
                </div>
              </div>

              {filteredConversations.length === 0 ? (
                <p className="no-conversations">No conversations found</p>
              ) : (
                <div className="conversation-list" ref={conversationListRef}>
                  {filteredConversations.length > 0 ? (
                    filteredConversations.map((conv, idx) => {
                      // Ensure conversation exists
                      if (!conv) return null;
                      const uniqueKey = `${conv.id ?? idx}-${conv.twilio_number}-${conv.contact_phone}-${conv.last_message_at || idx}`;
                      const lastRelevantMessage = [...(conv.messages || [])]
                        .reverse()
                        .find((msg) => !isOptOutMessage(msg) && !isBulkStopMessage(msg));

                      return (
                        <div
                          key={uniqueKey}
                          className={`conversation-item ${conv.has_unread ? 'unread' : ''} ${
                            selectedConversation?.id === conv.id ? 'active' : ''
                          }`}
                          onClick={() => handleConversationSelect(conv)}
                        >
                          <div className="conversation-item-row">
                            <span className="conversation-name">
                              {formatContactName(conv)}
                            </span>
                            <div className="conversation-time-container">
                              <div className="conversation-time">
                                {lastRelevantMessage
                                  ? formatMessageDate(lastRelevantMessage.timestamp)
                                  : formatMessageDate(conv.last_message_at)}
                              </div>
                              {conv.has_unread && <div className="unread-dot"></div>}
                            </div>
                          </div>
                          <div className="conversation-preview-row">
                            <span className="conversation-preview">
                              {lastRelevantMessage?.body?.substring(0, 50) || 'New conversation'}
                              {lastRelevantMessage?.body?.length > 50 ? '...' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-conversations">
                      {conversations.length === 0 
                        ? 'No conversations found' 
                        : 'No conversations match your filters'}
                    </p>
                  )}
                  
                  {isFetchingMore && (
                    <div className="loading-more">
                      <div className="spinner"></div>
                      Loading more conversations...
                    </div>
                  )}
                  
                  {!hasMore && conversations.length > 0 && (
                    <div className="no-more-conversations">
                      No more conversations to load
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Panel */}
            <div className="inbox-chat">
              {selectedConversation ? (
                <>
                  <div className="chat-header">
                    <div>
                      <h3>
                        {formatContactName(selectedConversation)}
                          {selectedConversation.latest_campaign_name && (
                            <span className="campaign-tag"> — {selectedConversation.latest_campaign_name}</span>
                          )}
                      </h3>
                      <div className="conversation-meta">
                        <span>{selectedConversation.contact_phone}</span>
                        {selectedConversation.twilio_number && <span> from {selectedConversation.twilio_number}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="chat-messages">
                    {selectedConversation.messages
                      .filter((msg) => !isOptOutMessage(msg) && !isBulkStopMessage(msg))
                      .reduce((acc, msg, index, array) => {
                        let showSeparator = false;
                        if (index === 0) {
                          showSeparator = true;
                        } else {
                          const currentDate = new Date(msg.timestamp);
                          const prevDate = new Date(array[index - 1].timestamp);
                          const currentHour = currentDate.getHours();
                          const currentDay = currentDate.toDateString();
                          const prevHour = prevDate.getHours();
                          const prevDay = prevDate.toDateString();

                          if (currentDay !== prevDay || currentHour !== prevHour) {
                            showSeparator = true;
                          }
                        }

                        if (showSeparator) {
                          const messageDate = new Date(msg.timestamp);
                          const today = new Date();
                          const yesterday = new Date(today);
                          yesterday.setDate(yesterday.getDate() - 1);

                          let timeLabel;
                          if (messageDate.toDateString() === today.toDateString()) {
                            timeLabel = messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          } else if (messageDate.toDateString() === yesterday.toDateString()) {
                            timeLabel = "Yesterday";
                          } else {
                            timeLabel = messageDate.toLocaleDateString();
                          }

                          acc.push(
                            <div key={`date-${msg.timestamp}`} className="message-date-separator">
                              <span>{timeLabel}</span>
                            </div>,
                          );
                        }

                        acc.push(
                          <div
                            key={msg.id || msg.timestamp}
                            className={`message-wrapper ${msg.direction === "outbound" ? "align-right" : "align-left"}`}
                          >
                            <div className={`message-bubble ${msg.direction === "outbound" ? "sent" : "received"}`}>
                              {msg.body}
                              <span className="message-time">
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>,
                        );

                        return acc;
                      }, [])}
                    <div ref={bottomRef} />
                  </div>

                  <div className="chat-input">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your message..."
                    />
                    <button onClick={() => {
                      if (!replyText.trim() || !selectedConversation) return;

                      axios.post(`${API_URL}/api/message/reply`, {
                        to: selectedConversation.contact_phone,
                        from: selectedConversation.twilio_number,
                        body: replyText,
                        direction: "outbound",
                        email: decodeURIComponent(email),
                      })
                      .then(() => {
                        const newMessage = {
                          id: Date.now().toString(),
                          body: replyText,
                          direction: "outbound",
                          timestamp: new Date().toISOString(),
                        };

                        setSelectedConversation(prev => ({
                          ...prev,
                          messages: [...prev.messages, newMessage],
                        }));

                        setConversations(prev =>
                          prev.map(conv =>
                            conv.twilio_number === selectedConversation.twilio_number &&
                            conv.contact_phone === selectedConversation.contact_phone
                              ? {
                                  ...conv,
                                  messages: [...conv.messages, newMessage],
                                  last_message: replyText,
                                  last_message_at: new Date().toISOString(),
                                }
                              : conv,
                          ),
                        );

                        setReplyText("");
                        setSuccess("Message sent successfully!");
                        setTimeout(() => setSuccess(null), 3000);
                        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                        setTimeout(() => fetchConversations(true), 1000);
                      })
                      .catch(err => {
                        console.error("Failed to send reply:", err);
                        setError("Failed to send message. Please try again.");
                      });
                    }}>Send</button>
                  </div>
                </>
              ) : (
                <div className="no-chat-selected">Select a conversation to view messages</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="modal-overlay">
          <div className="modal-content new-message-modal">
            <h3>Send New Message</h3>
            <label>
              From Number:
              {isLoadingUserData ? (
                <div className="loading-numbers">Loading sender options...</div>
              ) : userRole === "admin" ? (
                <select
                  value={twilioNumber}
                  onChange={(e) => setTwilioNumber(e.target.value)}
                  required
                  className="form-control"
                >
                  <option value="" disabled>
                    Select a Twilio number
                  </option>
                  {allNumbers.map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              ) : assignedNumbers.length > 0 ? (
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
              ) : (
                <input type="text" value="No numbers assigned - contact admin" disabled className="form-control disabled-input" />
              )}
            </label>
            <label>
              To Number:
              <input
                type="text"
                value={newMsgTo}
                onChange={(e) => setNewMsgTo(e.target.value)}
                placeholder="+12245556666"
                className="form-control"
              />
            </label>
            <label>
              Message:
              <textarea
                value={newMsgBody}
                onChange={(e) => setNewMsgBody(e.target.value)}
                placeholder="Type your message..."
                className="form-control"
              />
            </label>
            {newMsgError && <div className="error-banner">{newMsgError}</div>}
            <div className="modal-actions">
              <button onClick={() => {
                setNewMsgError(null);
                if (!newMsgTo.trim() || !newMsgBody.trim() || !twilioNumber) {
                  setNewMsgError("All fields are required.");
                  return;
                }

                setNewMsgLoading(true);
                axios.post(`${API_URL}/api/message/single`, {
                  fromNumber: twilioNumber,
                  toNumber: newMsgTo,
                  message: newMsgBody,
                  email: decodeURIComponent(email),
                })
                .then(() => {
                  setShowNewMessageModal(false);
                  setNewMsgTo("");
                  setNewMsgBody("");
                  setSuccess("Message sent successfully!");
                  setTimeout(() => setSuccess(null), 3000);
                  fetchConversations(true);
                })
                .catch(err => {
                  setNewMsgError(err.response?.data?.error || "Failed to send message. Please try again.");
                })
                .finally(() => {
                  setNewMsgLoading(false);
                });
              }} disabled={newMsgLoading} className="send-btn">
                {newMsgLoading ? "Sending..." : "Send"}
              </button>
              <button onClick={() => setShowNewMessageModal(false)} disabled={newMsgLoading} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;