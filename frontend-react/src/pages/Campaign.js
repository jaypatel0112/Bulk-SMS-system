// Campaign.js
import axios from "axios"
import Papa from "papaparse"
import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import * as XLSX from "xlsx"
import Sidebar from "../components/Sidebar"
import TopNavbar from "../components/TopNavbar"
import "./Campaign.css"

const Campaign = () => {
  const { email } = useParams()
  const navigate = useNavigate()
  const [csvFile, setCsvFile] = useState(null)
  const [csvHeaders, setCsvHeaders] = useState([])
  const [message, setMessage] = useState("")
  const [twilioNumber, setTwilioNumber] = useState("")
  const [campaignName, setCampaignName] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contacts, setContacts] = useState([])
  const [showPreview, setShowPreview] = useState(false)
  const [showVars, setShowVars] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [assignedNumbers, setAssignedNumbers] = useState([])
  const [allNumbers, setAllNumbers] = useState([])
  const [isLoadingUserData, setIsLoadingUserData] = useState(true)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [showContactsLoaded, setShowContactsLoaded] = useState(false)

  const messageRef = useRef(null)
  const MAX_CHAR_LIMIT = 160
  const RESERVED_STOP_LENGTH = 20

  useEffect(() => {
    if (!email) {
      navigate("/login")
    } else {
      fetchUserData()
    }
    // eslint-disable-next-line
  }, [email, navigate])

  const fetchUserData = async () => {
    setIsLoadingUserData(true)
    try {
      const roleResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/user/role/${encodeURIComponent(email)}`,
        { params: { email } }
      )
      const role = roleResponse.data.role

      if (role === 1 || roleResponse.data.user_id === null) {
        setUserRole("admin")
        const allNumbersResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/twilionumber`
        )
        const uniqueNumbers = Array.from(
          new Set((allNumbersResponse.data || []).map((n) => n.phone_number))
        )
        setAllNumbers(uniqueNumbers)
        if (uniqueNumbers.length > 0) setTwilioNumber(uniqueNumbers[0])
      } else {
        setUserRole("user")
        const numbersResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/twilionumber/user-numbers/${encodeURIComponent(email)}`,
          { params: { email } }
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
      console.error("Error fetching user data:", error)
      toast.error("Failed to load user information")
    } finally {
      setIsLoadingUserData(false)
    }
  }

  const processParsedData = (data) => {
    if (!data || data.length === 0) {
      setFeedbackMsg({ type: "error", text: "File is empty or could not be parsed." })
      return
    }

    const headers = Object.keys(data[0] || {})
    const normalizedHeaders = headers.map((h) =>
      String(h).trim().toLowerCase().replace(/\s+/g, "_")
    )

    const normalized = data.map((row) => {
      const obj = {}
      headers.forEach((h, index) => {
        const normalizedKey = normalizedHeaders[index]
        const value = row[h]
        obj[normalizedKey] = value === null || value === undefined ? "" : String(value).trim()
      })
      return obj
    })

    setCsvHeaders(normalizedHeaders)
    setContacts(normalized)
    setFeedbackMsg({ type: "success", text: "File loaded successfully." })
    setShowContactsLoaded(true)
    setTimeout(() => setShowContactsLoaded(false), 3000)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file || !(file.type === "text/csv" || file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      setFeedbackMsg({ type: "error", text: "Please upload a valid CSV or Excel file." })
      return
    }

    setCsvFile(file)
    setIsUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          return 100
        }
        return prev + 10
      })
    }, 200)

    if (file.type === "text/csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processParsedData(results.data),
        error: (err) => {
          setFeedbackMsg({ type: "error", text: "Error parsing CSV file." })
          console.error(err)
          setIsUploading(false)
        },
      })
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        processParsedData(jsonData)
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const removeFile = (e) => {
    if (e) e.preventDefault()
    setCsvFile(null)
    setContacts([])
    setCsvHeaders([])
    setFeedbackMsg(null)
    setUploadProgress(0)
    setIsUploading(false)
  }

  const handleInsertVariable = (variable) => {
    const normalizedVar = variable.trim().toLowerCase().replace(/\s+/g, "_")
    const cursorPos = messageRef.current.selectionStart
    const newMessage = `${message.slice(0, cursorPos)}\${${normalizedVar}}${message.slice(cursorPos)}`
    setMessage(newMessage)
    setShowVars(false)
    setTimeout(() => {
      messageRef.current.focus()
      messageRef.current.selectionStart = cursorPos + normalizedVar.length + 3
      messageRef.current.selectionEnd = cursorPos + normalizedVar.length + 3
    }, 0)
  }

  // Combine date and time into a single ISO string (UTC)
  const convertCDTToUTC = (cdtDate) => {
    if (!cdtDate || !scheduledTime) return null
    // Combine date and time into a single ISO string
    const combined = `${cdtDate}T${scheduledTime}:00`
    const date = new Date(combined)
    return date.toISOString()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const STOP_TEXT = "\nSTOP to opt out."
    const updatedMessage = message + STOP_TEXT

    if (!csvFile || !updatedMessage || !twilioNumber || !campaignName || contacts.length === 0) {
      toast.error("Please fill in all fields and upload a CSV with valid contacts.")
      return
    }

    if (message.length > MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH) {
      toast.error(`Message too long! Max allowed is ${MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH} characters.`)
      return
    }

    setIsSubmitting(true)
    const payload = {
      campaign_name: campaignName,
      sender_id: twilioNumber,
      message_template: updatedMessage,
      contacts,
      scheduled_at: convertCDTToUTC(scheduledAt),
      user_email: decodeURIComponent(email),
      user_role: userRole,
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/campaign/upload`, payload)
      toast.success("🚀 Campaign launched successfully!")
      setTimeout(() => navigate(`/dashboard/${email}`), 2000)
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || "Campaign launch failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

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
          {allNumbers.map((num) => (
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

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handlePreviewToggle = () => {
    setShowPreview(!showPreview)
  }

  return (
    <div className="dashboard-wrapper">
      <Sidebar email={decodeURIComponent(email)} />
      
      <div className="dashboard-main-create-campaign">
        <TopNavbar customTitle="Create Campaign" />

        <div className={`campaign-main-content${showPreview ? " with-preview" : ""}`}>
          <div className={`form-container${showPreview ? " shrink" : ""}`}>
            <form onSubmit={handleSubmit} className="campaign-form-new">
              <div className="form-field">
                <div className="form-field-row">
                  <label>Campaign Name</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Enter campaign name"
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-field">
                <div className="form-field-row">
                  <label>Sender Number</label>
                  {renderSenderNumberInput()}
                </div>
              </div>

              <div className="form-field schedule-field">
                <div className="form-field-row">
                  <label>Schedule Time (optional)</label>
                  <div className="schedule-inputs">
                    <div className="date-input">
                      <label className="sub-label">Select Date</label>
                      <input
                        type="date"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="time-input">
                      <label className="sub-label">Select Time</label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-field message-field">
                <div className="form-field-row">
                  <label>Message Content</label>
                  <div className="message-container">
                    <textarea
                      ref={messageRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Hey ${first_name}, special deal just for you!"
                      maxLength={MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH}
                      required
                      className="form-textarea"
                    />
                    <div className="message-footer">
                      <div className="char-counter">
                        {message.length}/{MAX_CHAR_LIMIT - RESERVED_STOP_LENGTH} STOP message will be auto-added
                      </div>
                      {csvHeaders.length > 0 && (
                        <button
                          type="button"
                          className="insert-vars-btn"
                          onClick={() => setShowVars(!showVars)}
                        >
                          Insert Variables
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

              <div className="form-field upload-field">
                <div className="form-field-row">
                  <label>Contact List (CSV or Excel)</label>
                  <div className="upload-container">
                    <div className="upload-header">
                      <span>Uploads</span>
                      <span className="upload-status">
                        {csvFile ? "1 file" : "None"}
                      </span>
                    </div>
                    <div className="upload-content-wrapper">
                      {/* Left side - Upload area */}
                      <div
                        className="file-upload-area-new"
                        onClick={() => document.getElementById("file-input").click()}
                        style={{ cursor: "pointer" }}
                      >
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileChange}
                          id="file-input"
                          style={{ display: "none" }}
                        />
                        <div className="upload-content-new">
                          <div className="upload-icon-new">📄</div>
                          <p className="upload-text-new">Drag and drop files here</p>
                          <p className="upload-or">OR</p>
                          <button
                            type="button"
                            className="browse-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              document.getElementById("file-input").click()
                            }}
                          >
                            Browse Files
                          </button>
                        </div>
                      </div>

                      {/* Right side - Uploaded files */}
                      {csvFile && (
                        <div className="uploaded-files-section">
                          <div className="uploaded-file-item">
                            <div className="file-info">
                              <div className="file-name">{csvFile.name}</div>
                              <div className="file-details">
                                {contacts.length} contacts loaded
                              </div>
                            </div>
                            <button className="remove-file-btn" onClick={removeFile}>
                              ×
                            </button>
                          </div>
                          {isUploading && (
                            <div className="upload-progress-item">
                              <div className="progress-info">
                                <span className="progress-text">Uploading {csvFile.name}</span>
                                <span className="progress-percentage">{uploadProgress}%</span>
                              </div>
                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {contacts.length > 0 && !isUploading && showContactsLoaded && (
                      <div className="contacts-loaded">
                        ✅ {contacts.length} contacts loaded
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting || (userRole !== "admin" && assignedNumbers.length === 0)}
                >
                  {isSubmitting ? "Launching..." : "Launch Campaign"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePreviewToggle}
                >
                  {showPreview ? "Hide Preview" : "Preview Message"}
                </button>
              </div>
            </form>
          </div>

          {/* Preview Area (side-by-side, only visible if showPreview) */}
          {showPreview && (
            <div className="preview-area active">
              <div className="preview-header">
                <div className="preview-contact-info">
                  <h4>{campaignName || "Contact Name"}</h4>
                  <p>{twilioNumber || "+1234567890"}</p>
                </div>
                <button
                  className="preview-close"
                  onClick={() => setShowPreview(false)}
                  aria-label="Close Preview"
                >
                  ×
                </button>
              </div>
              <div className="preview-messages">
                {message ? (
                  <div>
                    <div className="preview-message-bubble">
                      {message}
                      <br />
                      <em style={{ fontSize: "11px", opacity: 0.8 }}>
                        STOP to opt out.
                      </em>
                    </div>
                    <div className="preview-message-time">
                      {getCurrentTime()}
                    </div>
                  </div>
                ) : (
                  <div className="preview-empty-state">
                    Type your message to see preview...
                  </div>
                )}
              </div>
              <div className="preview-input-area">
                <input
                  type="text"
                  className="preview-input"
                  placeholder="Type your message..."
                  disabled
                />
                <button className="preview-send-btn" disabled>
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
        <ToastContainer />
      </div>
    </div>
  )
}

export default Campaign
