const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5050;
const JWT_SECRET = process.env.JWT_SECRET || 'corpRAG_secret_key_2026';
const FLOWISE_PREDICTION_URL = process.env.FLOWISE_PREDICTION_URL || "http://localhost:3000/api/v1/prediction/79d8f8ed-b5ef-4dd9-b988-6f1309e9e042";
const FLOWISE_CHATBOT_URL = process.env.FLOWISE_CHATBOT_URL || "http://localhost:3000/chatbot/79d8f8ed-b5ef-4dd9-b988-6f1309e9e042";
const GOOGLE_SCRIPT_WEBAPP_URL = process.env.GOOGLE_SCRIPT_WEBAPP_URL || "";

app.use(cors());
app.use(express.json());

// In-Memory User Store Fallback (if Google Apps Script URL not configured yet)
const memoryUsers = new Map();

// Helper: Call Google Apps Script Web App
async function callGoogleScript(payload) {
  if (!GOOGLE_SCRIPT_WEBAPP_URL || GOOGLE_SCRIPT_WEBAPP_URL.includes("YOUR_SCRIPT_ID")) {
    return null; // Fallback to in-memory if URL not set
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
// AUTHENTICATION ROUTES (JWT & Bcrypt Password Hashing)
// ----------------------------------------------------------------------------

// 1. User Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedEmail = email.toLowerCase().trim();

    // Try saving to Google Sheet via Apps Script
    const gsRes = await callGoogleScript({
      action: 'SIGNUP',
      name,
      email: normalizedEmail,
      hashedPassword
    });

    if (gsRes && !gsRes.success) {
      return res.status(400).json({ error: gsRes.message || 'Failed to register user.' });
    }

    // Fallback to in-memory store
    memoryUsers.set(normalizedEmail, {
      id: 'usr_' + Date.now(),
      name,
      email: normalizedEmail,
      hashedPassword
    });

    // Generate JWT Token
    const token = jwt.sign({ name, email: normalizedEmail }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'User registered successfully!',
      token,
      user: { name, email: normalizedEmail }
    });

  } catch (err) {
    res.status(500).json({ error: 'Sign up failed: ' + err.message });
  }
});

// 2. User Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    // Fetch user from Google Sheet via Apps Script
    const gsRes = await callGoogleScript({
      action: 'GET_USER',
      email: normalizedEmail
    });

    if (gsRes && gsRes.success) {
      user = gsRes.user;
    } else {
      // Fallback to in-memory store
      user = memoryUsers.get(normalizedEmail);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify Password Hash
    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Issue JWT Token
    const token = jwt.sign({ name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful!',
      token,
      user: { name: user.name, email: user.email }
    });

  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Helper JWT Verification Middleware
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
// RAG & FLOWISE ROUTES
// ----------------------------------------------------------------------------

// Protected Query Route (Flowise RAG Pipeline)
app.post('/api/chat/query', authenticateToken, async (req, res) => {
  const { question } = req.body;
  const userEmail = req.user.email;

  if (!question) return res.status(400).json({ error: 'Question parameter required.' });

  try {
    const fetchRes = await fetch(FLOWISE_PREDICTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    const data = await fetchRes.json();
    const responseText = typeof data === 'string' ? data : (data.text || JSON.stringify(data));

    // Log Query to Google Sheet via Apps Script
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

// Config Route for Frontend
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
