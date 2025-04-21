import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";
import "./Inbox.css";

const API_URL = process.env.REACT_APP_API_URL;

const Inbox = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [newMessageFlags, setNewMessageFlags] = useState({});

  // Fetch all conversations
  const fetchConversations = () => {
    axios
      .get(`${API_URL}/api/conversations`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      })
      .then((res) => {
        setConversations(res.data);

        // Update newMessageFlags if there are new messages
        const updatedFlags = { ...newMessageFlags };
        res.data.forEach((conv) => {
          if (
            selectedConversation?.id !== conv.id &&
            conv.has_new_messages // backend should ideally provide this flag
          ) {
            updatedFlags[conv.id] = true;
          } else {
            updatedFlags[conv.id] = false;
          }
        });
        setNewMessageFlags(updatedFlags);
      })
      .catch((err) => console.error("Error fetching conversations", err));
  };

  // Fetch messages for selected conversation
  const fetchMessages = () => {
    if (!selectedConversation) return;

    axios
      .get(`${API_URL}/api/conversations/${selectedConversation.id}/messages`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      })
      .then((res) => {
        const formattedMessages = res.data.map((msg) => ({
          ...msg,
          direction: msg.direction === "outbound" ? "outgoing" : "incoming",
        }));
        setMessages(formattedMessages);
      })
      .catch((err) => console.error("Error fetching messages", err));
  };

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when selected conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();

      // Clear new message indicator for this conversation
      setNewMessageFlags((prev) => ({ ...prev, [selectedConversation.id]: false }));
    }
  }, [selectedConversation]);

  // Poll every 5s for updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();

      if (selectedConversation) {
        fetchMessages();
      }
    }, 5000);
    return () => clearInterval(interval);
  });

  const sendReply = () => {
    if (!replyText.trim()) return;

    axios
      .post(`${API_URL}/api/message/reply`, {
        to: selectedConversation.contact_phone,
        from: "+12244452202", // Your Twilio number
        body: replyText,
        direction: "outbound",
      })
      .then(() => {
        const newMessage = {
          body: replyText,
          direction: "outgoing",
          sent_at: new Date().toISOString(),
        };
        setReplyText("");
        setMessages((prev) => [...prev, newMessage]);
      })
      .catch((err) => console.error("Error sending reply", err.response?.data || err));
  };

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h2>💬 Inbox</h2>
        </div>

        <div className="inbox-container">
          <div className="inbox-sidebar">
            <h3>Conversations</h3>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${selectedConversation?.id === conv.id ? "active" : ""} ${
                  newMessageFlags[conv.id] ? "new-message" : ""
                }`}
                onClick={() => setSelectedConversation(conv)}
              >
                <strong>{conv.contact_phone}</strong>
                <span>Status: {conv.status}</span>
              </div>
            ))}
          </div>

          <div className="inbox-chat">
            {selectedConversation ? (
              <>
                <div className="chat-header">
                  <h3>{selectedConversation.contact_phone}</h3>
                </div>

                <div className="chat-messages">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`message-wrapper ${
                        msg.direction === "outgoing" ? "align-right" : "align-left"
                      }`}
                    >
                      <div
                        className={`message-bubble ${
                          msg.direction === "outgoing" ? "sent" : "received"
                        }`}
                      >
                        <p>{msg.body}</p>
                        <span className="timestamp">
                          {new Date(msg.sent_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="chat-input">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message..."
                  />
                  <button onClick={sendReply}>Send</button>
                </div>
              </>
            ) : (
              <div className="chat-placeholder">
                <p>Select a conversation to begin chatting.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;
