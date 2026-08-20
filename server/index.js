const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'corpRAG_secret_key_2026';
const FLOWISE_PREDICTION_URL = process.env.FLOWISE_PREDICTION_URL || "http://localhost:3000/api/v1/prediction/79d8f8ed-b5ef-4dd9-b988-6f1309e9e042";
const FLOWISE_CHATBOT_URL = process.env.FLOWISE_CHATBOT_URL || "http://localhost:3000/chatbot/79d8f8ed-b5ef-4dd9-b988-6f1309e9e042";
const GOOGLE_SCRIPT_WEBAPP_URL = process.env.GOOGLE_SCRIPT_WEBAPP_URL || "";

app.use(cors());
app.use(express.json());

// In-Memory Fallbacks
const memoryUsers = new Map();
const memoryOTPs = new Map();

// Helper: Call Google Apps Script Web App
async function callGoogleScript(payload) {
  if (!GOOGLE_SCRIPT_WEBAPP_URL || GOOGLE_SCRIPT_WEBAPP_URL.includes("YOUR_SCRIPT_ID")) {
    return null;
  }
  try {
    const res = await fetch(GOOGLE_SCRIPT_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error("⚠️ Google Apps Script Call Error:", err.message);
    return null;
  }
}

// ----------------------------------------------------------------------------
// AUTHENTICATION & OTP ROUTES
// ----------------------------------------------------------------------------

// 1. Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedEmail = email.toLowerCase().trim();

    const gsRes = await callGoogleScript({
      action: 'SIGNUP',
      name,
      email: normalizedEmail,
      hashedPassword
    });

    if (gsRes && !gsRes.success) {
      return res.status(400).json({ error: gsRes.message || 'Failed to register.' });
    }

    memoryUsers.set(normalizedEmail, { id: 'usr_' + Date.now(), name, email: normalizedEmail, hashedPassword });
    const token = jwt.sign({ name, email: normalizedEmail }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'User registered successfully!', token, user: { name, email: normalizedEmail } });
  } catch (err) {
    res.status(500).json({ error: 'Sign up failed: ' + err.message });
  }
});

// 2. Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  try {
    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    const gsRes = await callGoogleScript({ action: 'GET_USER', email: normalizedEmail });
    if (gsRes && gsRes.success) {
      user = gsRes.user;
    } else {
      user = memoryUsers.get(normalizedEmail);
    }

    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful!', token, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// 3. Send Forgot Password OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const normalizedEmail = email.toLowerCase().trim();
  
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

  // Store in memory fallback
  memoryOTPs.set(normalizedEmail, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  // Store in Google Sheet via Apps Script
  callGoogleScript({
    action: 'STORE_OTP',
    email: normalizedEmail,
    otp,
    expiresAt
  });

  console.log(`🔑 Generated OTP for ${normalizedEmail}: ${otp}`);

  res.json({
    message: 'OTP generated and sent successfully.',
    otp // Returned so user can view/test OTP directly
  });
});

// 4. Reset Password with OTP
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const newHashedPassword = await bcrypt.hash(newPassword, 10);

  // Check Google Script
  const gsRes = await callGoogleScript({
    action: 'VERIFY_RESET_PASSWORD',
    email: normalizedEmail,
    otp,
    newHashedPassword
  });

  if (gsRes && gsRes.success) {
    return res.json({ message: 'Password reset successfully! Please log in.' });
  }

  // Fallback to memory
  const stored = memoryOTPs.get(normalizedEmail);
  if (stored && stored.otp === otp && Date.now() < stored.expiresAt) {
    const memUser = memoryUsers.get(normalizedEmail);
    if (memUser) {
      memUser.hashedPassword = newHashedPassword;
      memoryUsers.set(normalizedEmail, memUser);
    }
    return res.json({ message: 'Password reset successfully!' });
  }

  res.status(400).json({ error: 'Invalid or expired OTP code.' });
});

// JWT Verification Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
}

// ----------------------------------------------------------------------------
// PRIVATIZED CHAT & RAG ROUTES (Strict User-Isolated Memory Sessions)
// ----------------------------------------------------------------------------

// Protected Query Route (Flowise RAG Pipeline with User Chat Isolation)
app.post('/api/chat/query', authenticateToken, async (req, res) => {
  const { question } = req.body;
  const userEmail = req.user.email; // Isolated User Identity

  if (!question) return res.status(400).json({ error: 'Question parameter required.' });

  try {
    // Flowise call with overrideConfig for User Session Isolation
    const fetchRes = await fetch(FLOWISE_PREDICTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question,
        overrideConfig: {
          sessionId: `user_session_${userEmail}` // Isolates conversation memory per user!
        }
      })
    });

    const data = await fetchRes.json();
    const responseText = typeof data === 'string' ? data : (data.text || JSON.stringify(data));

    // Log Query into Google Sheet with User Ownership
    callGoogleScript({
      action: 'LOG_QUERY',
      userEmail,
      question,
      response: responseText
    });

    res.json({
      text: responseText,
      sourceDocuments: data.sourceDocuments || []
    });

  } catch (err) {
    res.status(500).json({ error: 'Flowise Query Exception: ' + err.message });
  }
});

// Config Route
app.get('/api/config', (req, res) => {
  res.json({
    appName: 'corpRAG',
    flowiseChatbotUrl: FLOWISE_CHATBOT_URL,
    flowisePredictionUrl: FLOWISE_PREDICTION_URL
  });
});

app.listen(PORT, () => {
  console.log(`🚀 corpRAG Backend Server running on http://localhost:${PORT}`);
});
