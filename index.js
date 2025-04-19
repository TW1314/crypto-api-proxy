require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

// Constants
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://cda1c558-d264-406e-9ac6-40e63d7bdfb1-00-2u5ehg2kcznfo.janeway.replit.dev';

// Create Express app
const app = express();

// Apply security headers with Helmet
app.use(helmet());

// Configure CORS
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-KEY']
}));

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

// Apply rate limiting to all requests
app.use(limiter);

// API key middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Forward API requests
app.get('/api/forward', authenticateApiKey, async (req, res) => {
  try {
    const { url, ...params } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log(`Forwarding request to: ${url}`);
    
    const response = await axios.get(url, {
      params,
      timeout: 30000 // 30 second timeout
    });
    
    // Forward the response back to the client
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error forwarding request:', error.message);
    
    // Forward error status and message if available
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Proxy server error',
        message: error.message
      });
    }
  }
});

// Specific endpoints for Binance
app.get('/api/binance/fundingRate', authenticateApiKey, async (req, res) => {
  try {
    const { symbol, limit } = req.query;
    const url = 'https://fapi.binance.com/fapi/v1/fundingRate';
    
    const response = await axios.get(url, {
      params: { symbol, limit },
      timeout: 30000
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Binance funding rate error:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Binance API error',
        message: error.message
      });
    }
  }
});

app.get('/api/binance/openInterest', authenticateApiKey, async (req, res) => {
  try {
    const { symbol } = req.query;
    const url = 'https://fapi.binance.com/fapi/v1/openInterest';
    
    const response = await axios.get(url, {
      params: { symbol },
      timeout: 30000
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Binance open interest error:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Binance API error',
        message: error.message
      });
    }
  }
});

// Catch all other requests
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
