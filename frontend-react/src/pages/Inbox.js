"use client"
import axios from "axios"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import "./Inbox.css"

const API_URL = process.env.REACT_APP_API_URL
const optOutKeywords = ["stop", "stopall", "unsubscribe", "cancel", "quit", "end"]

function isOptOutMessage(message) {
  if (!message?.body) return false
  const body = message.body.toLowerCase().trim()
  return optOutKeywords.includes(body)
}

function isBulkStopMessage(message) {
  if (!message?.body) return false
  return message.body.trim().toLowerCase().endsWith("stop to opt out.")
}

const fetchLatestCampaignForNumber = async (twilio_number, contact_phone) => {
  try {
    const response = await axios.get(`${API_URL}/api/campaign/latestcampaign`, {
      params: { twilio_number, contact_phone },
    })
    if (Array.isArray(response.data)) {
      return response.data.length > 0 ? response.data[0].campaign_name : null
    }
    return response.data?.campaign_name || null
  } catch (error) {
    console.error("Error fetching latest campaign:", error)
    return null
  }
}

const Inbox = () => {
  const { email } = useParams()
  const navigate = useNavigate()
  
  // State declarations
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [replyText, setReplyText] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [newMessageAlert, setNewMessageAlert] = useState(false)
  const [sortOption, setSortOption] = useState(localStorage.getItem("inboxSortOption") || "newest")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  
  // Refs
  const bottomRef = useRef(null)
  const conversationsRef = useRef([])
  const selectedConversationRef = useRef(null)

  // New Message Modal State
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)
  const [newMsgTo, setNewMsgTo] = useState("")
  const [newMsgBody, setNewMsgBody] = useState("")
  const [newMsgLoading, setNewMsgLoading] = useState(false)
  const [newMsgError, setNewMsgError] = useState(null)

  // Sender number dropdown state
  const [twilioNumber, setTwilioNumber] = useState("")
  const [userRole, setUserRole] = useState(null)
  const [assignedNumbers, setAssignedNumbers] = useState([])
  const [allNumbers, setAllNumbers] = useState([])
  const [isLoadingUserData, setIsLoadingUserData] = useState(true)

  // Update refs when state changes
  useEffect(() => {
    conversationsRef.current = conversations
    selectedConversationRef.current = selectedConversation
  }, [conversations, selectedConversation])

  // Utility functions
  const formatContactName = (conv) => {
    if (conv.contact_display) return conv.contact_display
    if (conv.contact_first_name || conv.contact_last_name)
      return `${conv.contact_first_name || ""} ${conv.contact_last_name || ""}`.trim()
    return conv.contact_phone || ""
  }

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return ""
    const messageDate = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return messageDate.toLocaleDateString()
    }
  }

  // API functions
  const markConversationAsRead = useCallback(async (twilio_number, contact_phone) => {
    try {
      const response = await axios.post(`${API_URL}/api/message/mark-conversation-read`, {
        twilio_number,
        contact_phone,
        email: decodeURIComponent(email),
      })
      
      if (response.data.success) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.twilio_number === twilio_number && conv.contact_phone === contact_phone
              ? { ...conv, has_unread: false }
              : conv,
          ),
        )
        setSelectedConversation((prev) =>
          prev && prev.twilio_number === twilio_number && prev.contact_phone === contact_phone
            ? { ...prev, has_unread: false }
            : prev,
        )
      }
    } catch (error) {
      console.error("Error marking conversation as read:", error)
      setError("Failed to mark conversation as read. Please try again.")
    }
  }, [email])

  const fetchConversations = useCallback(async (silent = false) => {
    try {
      const decodedEmail = decodeURIComponent(email)
      const response = await axios.get(`${API_URL}/api/inbox/${decodedEmail}`)
      const newConversations = response.data
        .map((conv) => ({
          ...conv,
          messages: conv.messages || [],
          has_unread: conv.has_unread,
          display_name: formatContactName(conv),
        }))
        .filter((conv) => conv.messages.some((msg) => !isOptOutMessage(msg) && !isBulkStopMessage(msg)))
        .sort((a, b) => {
          if (sortOption === "unread") {
            if (a.has_unread && !b.has_unread) return -1
            if (!a.has_unread && b.has_unread) return 1
          }
          const aLast = a.messages[a.messages.length - 1]?.timestamp || a.created_at
          const bLast = b.messages[b.messages.length - 1]?.timestamp || b.created_at
          return new Date(bLast) - new Date(aLast)
        })

      if (!silent) {
        const prevConversations = conversationsRef.current
        const hasNewMessages = newConversations.some((newConv) => {
          const prevConv = prevConversations.find(
            (c) => c.twilio_number === newConv.twilio_number && c.contact_phone === newConv.contact_phone,
          )
          return (
            (!prevConv && newConv.messages.length > 0) ||
            (prevConv && newConv.messages.length > prevConv.messages.length)
          )
        })
        
        if (hasNewMessages) {
          setNewMessageAlert(true)
          setTimeout(() => setNewMessageAlert(false), 3000)
        }
      }

      setConversations(newConversations)
      setError(null)
      
      const prevSelected = selectedConversationRef.current
      if (prevSelected) {
        const updatedConv = newConversations.find(
          (c) => c.twilio_number === prevSelected.twilio_number && c.contact_phone === prevSelected.contact_phone,
        )
        if (updatedConv) {
          setSelectedConversation(updatedConv)
        } else {
          setSelectedConversation(null)
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err)
      setError("Failed to load conversations. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [email, sortOption])

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return
    
    try {
      const decodedEmail = decodeURIComponent(email)
      await axios.post(`${API_URL}/api/message/reply`, {
        to: selectedConversation.contact_phone,
        from: selectedConversation.twilio_number,
        body: replyText,
        direction: "outbound",
        email: decodedEmail,
      })

      const newMessage = {
        id: Date.now().toString(),
        body: replyText,
        direction: "outbound",
        timestamp: new Date().toISOString(),
      }

      setSelectedConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, newMessage],
      }))

      setConversations((prev) =>
        prev.map((conv) =>
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
      )

      setReplyText("")
      setSuccess("Message sent successfully!")
      setTimeout(() => setSuccess(null), 3000)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
      setTimeout(() => fetchConversations(true), 1000)
    } catch (err) {
      console.error("Failed to send reply:", err)
      setError("Failed to send message. Please try again.")
    }
  }

  const handleSendNewMessage = async () => {
    setNewMsgError(null)
    if (!newMsgTo.trim() || !newMsgBody.trim() || !twilioNumber) {
      setNewMsgError("All fields are required.")
      return
    }

    setNewMsgLoading(true)
    try {
      const decodedEmail = decodeURIComponent(email)
      await axios.post(`${API_URL}/api/message/single`, {
        fromNumber: twilioNumber,
        toNumber: newMsgTo,
        message: newMsgBody,
        email: decodedEmail,
      })

      setShowNewMessageModal(false)
      setNewMsgTo("")
      setNewMsgBody("")
      setSuccess("Message sent successfully!")
      setTimeout(() => setSuccess(null), 3000)
      fetchConversations(true)
    } catch (err) {
      setNewMsgError(err.response?.data?.error || "Failed to send message. Please try again.")
    } finally {
      setNewMsgLoading(false)
    }
  }

  // Event handlers
  const handleSortChange = (e) => {
    const value = e.target.value
    setSortOption(value)
    localStorage.setItem("inboxSortOption", value)
  }

  const handleConversationSelect = useCallback(async (conversation) => {
    setSelectedConversation(conversation)
    markConversationAsRead(conversation.twilio_number, conversation.contact_phone)
    const campaign = await fetchLatestCampaignForNumber(conversation.twilio_number, conversation.contact_phone)
    setSelectedConversation((prev) => ({
      ...prev,
      latest_campaign_name: campaign,
    }))
  }, [markConversationAsRead])

  // Effects
  useEffect(() => {
    if (!email) {
      navigate("/login")
      return
    }
    fetchConversations()
    const interval = setInterval(() => fetchConversations(true), 10000)
    return () => clearInterval(interval)
  }, [email, fetchConversations, navigate])

  useEffect(() => {
    if (selectedConversation?.messages?.length) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    }
  }, [selectedConversation])

  useEffect(() => {
    if (!showNewMessageModal) return
    
    const fetchUserAndNumbers = async () => {
      setIsLoadingUserData(true)
      try {
        const roleResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/user/role/${encodeURIComponent(email)}`,
          { params: { email } },
        )
        const role = roleResponse.data.role
        
        if (role === 1 || roleResponse.data.user_id === null) {
          setUserRole("admin")
          const allNumbersResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/twilionumber`)
          const uniqueNumbers = Array.from(new Set((allNumbersResponse.data || []).map((n) => n.phone_number)))
          setAllNumbers(uniqueNumbers)
          if (uniqueNumbers.length > 0) setTwilioNumber(uniqueNumbers[0])
        } else {
          setUserRole("user")
          const numbersResponse = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/twilio-numbers/user-numbers/${encodeURIComponent(email)}`,
            { params: { email } },
          )
          let numbers = []
          if (Array.isArray(numbersResponse.data.numbers)) {
            numbers = numbersResponse.data.numbers
          } else if (Array.isArray(numbersResponse.data)) {
            numbers = numbersResponse.data
          }
          setAssignedNumbers(numbers)
          if (numbers.length > 0) setTwilioNumber(numbers[0])
        }
      } catch (error) {
        setAllNumbers([])
        setAssignedNumbers([])
        setTwilioNumber("")
      } finally {
        setIsLoadingUserData(false)
      }
    }
    fetchUserAndNumbers()
  }, [showNewMessageModal, email])

  // Render functions
  const renderSenderNumberInput = () => {
    if (isLoadingUserData) {
      return <div className="loading-numbers">Loading sender options...</div>
    }

    if (userRole === "admin") {
      return (
        <select
          value={twilioNumber}
          onChange={(e) => setTwilioNumber(e.target.value)}
          required
          className="form-control"
        >
          <option value="" disabled>
            Select a Twilio number
          </option>
          {allNumbers.map((num, idx) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
      )
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
      )
    }

    return (
      <input 
        type="text" 
        value="No numbers assigned - contact admin" 
        disabled 
        className="form-control disabled-input" 
      />
    )
  }

  // Filtered conversations
  const filteredConversations = conversations
    .filter((conv) => {
      if (filter === "unread") return conv.has_unread
      return true
    })
    .filter((conv) => conv.display_name?.toLowerCase().includes(search.toLowerCase()))

  // Loading state
  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar email={decodeURIComponent(email)} />
        <div className="inbox-dashboard-main">
          <div className="loading-spinner">Loading conversations...</div>
        </div>
      </div>
    )
  }

  // Main render
  return (
    <div className="dashboard-wrapper">
      <Sidebar email={decodeURIComponent(email)} />
      <div className="inbox-dashboard-main">
        <div className="dashboard-content-wrapper">
          <div className="dashboard-header">
            <div className="dashboard-header-content">
              <h2>Inbox</h2>
              <div className="header-email">{decodeURIComponent(email)}</div>
            </div>
            <div className="header-messages">
            {error && <div className="error-banner">{error}</div>}
            {success && <div className="success-banner">{success}</div>}
            {newMessageAlert && (
              <div className="new-message-alert" onClick={() => setNewMessageAlert(false)}>
                New messages received!
              </div>
            )}
          </div>
            <button 
              className="new-message-btn"
              onClick={() => setShowNewMessageModal(true)} 
              title="Send a new message"
            >
              New Message
            </button>
            
          </div>

          <div className="inbox-container">
            {/* Sidebar */}
            <div className="inbox-sidebar">
              <div className="sidebar-header">
                <h3>Conversations ({conversations.length})</h3>
                <div className="filter-controls">
                  <input
                    className="conversation-search"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button 
                    className={`pill-btn${filter === "all" ? " active" : ""}`} 
                    onClick={() => setFilter("all")}
                  >
                    All
                  </button>
                  <button
                    className={`pill-btn${filter === "unread" ? " active" : ""}`}
                    onClick={() => setFilter("unread")}
                  >
                    Unread
                  </button>
                  <select 
                    className="conversation-dropdown" 
                    onChange={handleSortChange} 
                    value={sortOption}
                  >
                    <option value="newest">Newest</option>
                    <option value="unread">Unread</option>
                  </select>
                </div>
              </div>

              {filteredConversations.length === 0 ? (
                <p className="no-conversations">No conversations found</p>
              ) : (
                <div className="conversation-list">
                  {filteredConversations.map((conv, idx) => {
                    const lastRelevantMessage = [...conv.messages]
                      .reverse()
                      .find((msg) => !isOptOutMessage(msg) && !isBulkStopMessage(msg))
                    
                    return (
                      <div
                        key={conv.twilio_number + conv.contact_phone + idx}
                        className={
                          "conversation-item" +
                          (conv.has_unread ? " unread" : "") +
                          (selectedConversation?.twilio_number === conv.twilio_number &&
                          selectedConversation?.contact_phone === conv.contact_phone
                            ? " active"
                            : "")
                        }
                        onClick={() => handleConversationSelect(conv)}
                      >
                        <div className="conversation-item-row">
                          <span className="conversation-name">{conv.display_name}</span>
                          <div className="conversation-time-container">
                            <div className="conversation-time">
                              {lastRelevantMessage
                                ? formatMessageDate(lastRelevantMessage.timestamp)
                                : formatMessageDate(conv.created_at)}
                            </div>
                            {conv.has_unread && <div className="unread-dot"></div>}
                          </div>
                        </div>
                        <div className="conversation-preview-row">
                          <span className="conversation-preview">
                            {lastRelevantMessage
                              ? lastRelevantMessage.body.substring(0, 50) +
                                (lastRelevantMessage.body.length > 50 ? "..." : "")
                              : "New conversation"}
                          </span>
                        </div>
                      </div>
                    )
                  })}
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
                        {selectedConversation.display_name}
                        {selectedConversation.latest_campaign_name && (
                          <span className="campaign-name">
                            <span className="separator">|</span>
                            <span className="campaign-text">
                              Last Campaign: {selectedConversation.latest_campaign_name}
                            </span>
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
                      .filter((msg) => !isOptOutMessage(msg) && !isBulkStopMessage(msg))
                      .reduce((acc, msg, index, array) => {
                        let showSeparator = false;
                        
                        if (index === 0) {
                          // Always show separator for first message
                          showSeparator = true;
                        } else {
                          const currentDate = new Date(msg.timestamp);
                          const prevDate = new Date(array[index - 1].timestamp);
                          
                          // Get the hour and date for comparison
                          const currentHour = currentDate.getHours();
                          const currentDay = currentDate.toDateString();
                          const prevHour = prevDate.getHours();
                          const prevDay = prevDate.toDateString();
                          
                          // Show separator only if:
                          // 1. Different day, OR
                          // 2. Same day but different hour
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
                            // Today - show time with hour
                            timeLabel = messageDate.toLocaleTimeString([], { 
                              hour: "2-digit", 
                              minute: "2-digit" 
                            });
                          } else if (messageDate.toDateString() === yesterday.toDateString()) {
                            timeLabel = "Yesterday";
                          } else {
                            // Other days - show date
                            timeLabel = messageDate.toLocaleDateString();
                          }
                          
                          acc.push(
                            <div key={`date-${msg.timestamp}`} className="message-date-separator">
                              <span>{timeLabel}</span>
                            </div>
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
                          </div>
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
                    <button onClick={sendReply}>Send</button>
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
              {renderSenderNumberInput()}
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
              <button 
                onClick={handleSendNewMessage} 
                disabled={newMsgLoading} 
                className="send-btn"
              >
                {newMsgLoading ? "Sending..." : "Send"}
              </button>
              <button 
                onClick={() => setShowNewMessageModal(false)} 
                disabled={newMsgLoading} 
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inbox