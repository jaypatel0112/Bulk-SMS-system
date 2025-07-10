"use client"
import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import inbox from "../bgImages/icons/direct-inbox.png"
import SentIcon from "../bgImages/icons/send-2.png"
import notification from "../bgImages/icons/sms-notification.png"
import Sidebar from "../components/Sidebar"
import TopNavbar from "../components/TopNavbar"
import "./Dashboard.css"

const MessageStatistics = ({
  sentMessages,
  incomingMessages,
  optOuts,
  timeFilter,
  setTimeFilter
}) => (
  <div className="stats-section-new">
    <div className="stats-header-new">
      <h2>Message Statistics</h2>
      <select 
        className="time-filter-dropdown-new" 
        value={timeFilter} 
        onChange={(e) => setTimeFilter(e.target.value)}
      >
        <option value="1h">Last 1 hour</option>
        <option value="24h">Last 24 hours</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
      </select>
    </div>
    <div className="stats-grid-new">
      <div className="stat-card-new messages-sent stat-bg-1">
        <div className="stat-content-new">
          <div className="stat-label-new">Messages Sent</div>
          <div className="stat-value-new">{sentMessages.toLocaleString()}</div>
        </div>
        <div className="stat-icon-new">
          <img src={SentIcon} alt="Sent" className="stat-icon-img" />
        </div>
      </div>
      <div className="stat-card-new messages-received stat-bg-2">
        <div className="stat-content-new">
          <div className="stat-label-new">Messages Received</div>
          <div className="stat-value-new">{incomingMessages.toLocaleString()}</div>
        </div>
        <div className="stat-icon-new">
          <img src={notification} alt="Sent" className="stat-icon-img" />
        </div>
      </div>
      <div className="stat-card-new users-opted-out stat-bg-3">
        <div className="stat-content-new">
          <div className="stat-label-new">Users Opted Out</div>
          <div className="stat-value-new">{optOuts.toLocaleString()}</div>
        </div>
        <div className="stat-icon-new">
          <img src={inbox} alt="Sent" className="stat-icon-img" />
        </div>
      </div>
    </div>
  </div>
)

const Dashboard = () => {
  const { email } = useParams()
  const [campaigns, setCampaigns] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [role, setRole] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [sentMessages, setSentMessages] = useState(0)
  const [incomingMessages, setIncomingMessages] = useState(0)
  const [optOuts, setOptOuts] = useState(0)
  const [timeFilter, setTimeFilter] = useState("24h")
  const navigate = useNavigate()

  const getInitials = (email) => {
    const name = email.split("@")[0]
    return name
      .split(".")
      .map((n) => n[0]?.toUpperCase())
      .join("")
      .slice(0, 2)
  }

  const getAvatarClass = (initials) => {
    const colors = ["#4F46E5", "#3B82F6", "#6366F1", "#10B981", "#F59E0B"]
    const index = initials.charCodeAt(0) % colors.length
    return { backgroundColor: colors[index] }
  }

  const getUserRole = () => {
    if (role === 1) {
      return selectedUser ? "Administrator" : "You - Administrator"
    }
    return "Standard User"
  }

  useEffect(() => {
    if (!email) {
      navigate("/login")
      return
    }

    const fetchData = async () => {
      const decodedEmail = decodeURIComponent(email)
      try {
        const roleRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/user/role/${encodeURIComponent(decodedEmail)}`
        )

        if (roleRes.data?.role !== undefined) {
          setRole(roleRes.data.role)
          if (roleRes.data.role === 1) {
            try {
              const regularUsersRes = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/user/role/2/all`
              )
              setUsers([
                {
                  user_id: "admin",
                  email: decodedEmail,
                  isAdmin: true,
                },
                ...regularUsersRes.data.map((user) => ({
                  ...user,
                  isAdmin: false,
                })),
              ])
              setCampaigns([])
            } catch (err) {
              setUsers([
                {
                  user_id: "admin",
                  email: decodedEmail,
                  isAdmin: true,
                }
              ])
            }
          } else {
            const campaignsResponse = await axios.get(
              `${process.env.REACT_APP_API_URL}/api/campaign/${decodedEmail}`
            )
            setCampaigns(
              Array.isArray(campaignsResponse.data)
                ? campaignsResponse.data
                : campaignsResponse.data?.rows || []
            )
          }
        }
      } catch (err) {
        setError(
          err.response?.data?.error || err.message || "Failed to load data"
        )
        if (err.response?.status === 401) {
          navigate("/login")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [email, navigate])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const params = {
          email: decodeURIComponent(email),
          role,
          selectedUser: selectedUser || null,
          timeFilter,
        }
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/campaign/dashboard-stats`,
          { params }
        )
        setSentMessages(res.data.sentMessages || 0)
        setIncomingMessages(res.data.incomingMessages || 0)
        setOptOuts(res.data.optOutCount || 0)
      } catch (err) {
        console.error("Error fetching dashboard stats:", err)
      }
    }

    if (email && role !== null) {
      fetchStats()
    }
  }, [email, role, selectedUser, timeFilter])

  const handleUserClick = async (userEmail) => {
    try {
      setLoading(true)
      const campaignsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/campaign/${userEmail}`
      )
      setCampaigns(
        Array.isArray(campaignsResponse.data)
          ? campaignsResponse.data
          : campaignsResponse.data?.rows || []
      )
      setSelectedUser(userEmail)
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to load user campaigns"
      )
    } finally {
      setLoading(false)
    }
  }

  const handleBackToUsers = () => {
    setSelectedUser(null)
    setCampaigns([])
  }

  const handleDeleteUser = async (userEmail) => {
    if (!window.confirm(`Are you sure you want to delete ${userEmail}?`)) return
    setDeletingUser(userEmail)
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/user/${encodeURIComponent(userEmail)}`,
        {
          headers: { "Content-Type": "application/json" },
          data: { adminEmail: decodeURIComponent(email) },
        }
      )
      setUsers(users.filter((user) => user.email !== userEmail))
      if (selectedUser === userEmail) handleBackToUsers()
      toast.success(`User ${userEmail} deleted successfully`)
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete user")
    } finally {
      setDeletingUser(null)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Retry
        </button>
      </div>
    )
  }

  // Determine the TopNavbar title based on role and selectedUser
  let topNavbarTitle = ""
  if (role === 1 && !selectedUser) {
    topNavbarTitle = "BulkSms"
  } else if ((role === 1 && selectedUser) || role === 2) {
    topNavbarTitle = "User Management"
  }
  
  // Helper for user dashboard (used by both role 2 and admin viewing a user)
  const UserDashboardView = ({ userEmail }) => (
    <>
      <div className="user-profile-section">
        <div className="user-profile-card">
          <div className="user-profile-left">
            <div className="user-avatar-large" style={getAvatarClass(getInitials(userEmail))}>
              {getInitials(userEmail)}
            </div>
            <div className="user-profile-details">
              <h3>{userEmail}</h3>
              <p>{getUserRole()}</p>
            </div>
          </div>
          {role === 1 && selectedUser && (
            <button onClick={handleBackToUsers} className="back-to-users-btn">
              <span className="back-icon">←</span>
              Back to Users
            </button>
          )}
        </div>
      </div>

      <MessageStatistics
        sentMessages={sentMessages}
        incomingMessages={incomingMessages}
        optOuts={optOuts}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
      />

      <div className="campaigns-section-new">
        <div className="campaigns-header-new">
          <h2>Your Campaigns</h2>
        </div>
        <div className="campaigns-container-new">
          {campaigns.length > 0 ? (
            <div className="campaigns-grid-new">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="campaign-card-new"
                  onClick={() => navigate(`/campaign/${encodeURIComponent(userEmail)}/${campaign.id}`)}
                >
                  <div className="campaign-header-new">
                    <h3>{campaign.campaign_name || "Unnamed Campaign"}</h3>
                    <div className="campaign-arrow">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="campaign-footer-new">
                    <span className={`campaign-status-new ${campaign.status?.toLowerCase()}`}>
                      {campaign.status || "Unknown"}
                    </span>
                    <p className="campaign-date-new">
                      Created: {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No campaigns found</h3>
              <button
                onClick={() => navigate(`/campaign/${encodeURIComponent(userEmail)}`)}
                className="create-button"
              >
                Create New Campaign
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <div className="dashboard-container">
      <Sidebar email={decodeURIComponent(email)} role={role} />
      <TopNavbar customTitle={topNavbarTitle} />

      <div className="dashboard-main">
        {/* ADMIN MAIN DASHBOARD */}
        {role === 1 && !selectedUser && (
          <>
            <MessageStatistics
              sentMessages={sentMessages}
              incomingMessages={incomingMessages}
              optOuts={optOuts}
              timeFilter={timeFilter}
              setTimeFilter={setTimeFilter}
            />
            <div className="user-management-section">
              <h2>User Management</h2>
              <div className="users-container">
                {users.length > 0 ? (
                  <div className="users-grid">
                    {users.map((user) => {
                      const initials = getInitials(user.email)
                      return (
                        <div
                          key={user.user_id}
                          className={`user-card ${user.isAdmin ? "admin" : ""}`}
                          onClick={() => handleUserClick(user.email)}
                        >
                          <div className="user-header">
                            <div
                              className="user-avatar"
                              style={getAvatarClass(initials)}
                            >
                              {initials}
                            </div>
                            <div className="user-role">
                              {user.isAdmin ? "Administrator" : "Standard User"}
                            </div>
                          </div>
                          <div className="user-info">
                            <h3 title={user.email}>{user.email}</h3>
                          </div>
                          {user.isAdmin ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate("/login")
                              }}
                              className="user-button logout-button"
                            >
                              Log Out
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteUser(user.email)
                              }}
                              disabled={deletingUser === user.email}
                              className="user-button delete-button"
                            >
                              {deletingUser === user.email ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>No users found</h3>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* USER DASHBOARD (for role 2, or admin viewing a user) */}
        {((role === 2) || (role === 1 && selectedUser)) && (
          <UserDashboardView userEmail={selectedUser || decodeURIComponent(email)} />
        )}
      </div>
    </div>
  )
}

export default Dashboard
