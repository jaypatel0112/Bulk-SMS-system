import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";
import "./Inbox.css";

const API_URL = process.env.REACT_APP_API_URL;

const Inbox = () => {
  const { email } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/inbox/${encodeURIComponent(email)}`, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });

      const newConversations = res.data;

      setConversations(newConversations);

      // Always update the selectedConversation if it's still valid
      if (selectedConversation) {
        const updatedConv = newConversations.find(conv =>
          conv.twilio_number === selectedConversation.twilio_number &&
          conv.contact_phone === selectedConversation.contact_phone
        );

        if (updatedConv) {
          // Always update messages to reflect new incoming messages
          setSelectedConversation(prev => ({
            ...updatedConv
          }));
        } else {
          // If the conversation no longer exists, deselect
          setSelectedConversation(null);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching conversations", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!email) {
      navigate('/login');
      return;
    }

    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [email]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation?.messages]);

  const handleConversationSelect = (conv) => {
    setSelectedConversation(conv);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;

    try {
      await axios.post(`${API_URL}/api/message/reply`, {
        to: selectedConversation.contact_phone,
        from: selectedConversation.twilio_number,
        body: replyText,
        direction: "outbound",
        email: decodeURIComponent(email)
      });

      // Optimistic UI update
      const newMessage = {
        body: replyText,
        direction: "outbound",
        timestamp: new Date().toISOString()
      };

      setSelectedConversation(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage]
      }));

      // Also update the conversations sidebar preview
      setConversations(prev =>
        prev.map(conv =>
          conv.twilio_number === selectedConversation.twilio_number &&
          conv.contact_phone === selectedConversation.contact_phone
            ? { ...conv, messages: [...conv.messages, newMessage] }
            : conv
        )
      );

      setReplyText("");

      setTimeout(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);

    } catch (err) {
      console.error("Error sending reply", err);
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
        </div>

        <div className="inbox-container">
          <div className="inbox-sidebar">
            <h3>Conversations ({conversations.length})</h3>
            {conversations.length === 0 ? (
              <p className="no-conversations">No conversations found</p>
            ) : (
              conversations.map((conv, idx) => (
                <div
                  key={idx}
                  className={`conversation-item ${
                    selectedConversation &&
                    conv.twilio_number === selectedConversation.twilio_number &&
                    conv.contact_phone === selectedConversation.contact_phone
                      ? "active"
                      : ""
                  }`}
                  onClick={() => handleConversationSelect(conv)}
                >
                  <div className="conversation-header">
                    <strong>{conv.contact_phone}</strong>
                  </div>
                  <p className="conversation-preview">
                    {conv.messages.length > 0
                      ? conv.messages[conv.messages.length - 1].body.substring(0, 50)
                      : "No messages..."}
                  </p>
                  <span className="conversation-time">
                    {conv.messages.length > 0
                      ? new Date(conv.messages[conv.messages.length - 1].timestamp).toLocaleTimeString()
                      : ""}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="inbox-chat">
            {selectedConversation ? (
              <>
                <div className="chat-header">
                  <h3>Conversation with {selectedConversation.contact_phone}</h3>
                  <span className="conversation-status">
                    From Twilio Number: {selectedConversation.twilio_number}
                  </span>
                </div>

                <div className="chat-messages">
                  {selectedConversation.messages.length === 0 ? (
                    <p className="no-messages">No messages in this conversation</p>
                  ) : (
                    selectedConversation.messages
                      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                      .map((msg, idx) => (
                        <div
                          key={idx}
                          className={`message-wrapper ${
                            msg.direction === "outbound" ? "align-right" : "align-left"
                          }`}
                        >
                          <div
                            className={`message-bubble ${
                              msg.direction === "outbound" ? "sent" : "received"
                            }`}
                          >
                            <p>{msg.body}</p>
                            <span className="timestamp">
                              {new Date(msg.timestamp || msg.sent_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="chat-input">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                  />
                  <button onClick={sendReply}>Send</button>
                </div>
              </>
            ) : (
              <div className="chat-placeholder">
                <p>Select a conversation to view messages</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;