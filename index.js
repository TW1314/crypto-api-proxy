require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET']
}));

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  points: 10, // Number of requests
  duration: 1, // Per second
});

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (error) {
    res.status(429).json({ error: 'Too many requests, please try again later' });
  }
});

// Basic authentication middleware (optional)
const authenticateRequest = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Apply authentication if API_KEY is set
if (process.env.API_KEY) {
  app.use(authenticateRequest);
}

// Binance endpoints
app.get('/proxy/binance/funding-rate', async (req, res) => {
  try {
    const symbol = req.query.symbol || 'BTCUSDT';
    const limit = req.query.limit || 100;
    
    const response = await axios.get(`https://fapi.binance.com/fapi/v1/fundingRate`, {
      params: { symbol, limit }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Binance:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch from Binance API',
      details: error.message
    });
  }
});

app.get('/proxy/binance/open-interest', async (req, res) => {
  try {
    const symbol = req.query.symbol || 'BTCUSDT';
    
    const response = await axios.get(`https://fapi.binance.com/fapi/v1/openInterest`, {
      params: { symbol }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Binance:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch from Binance API',
      details: error.message
    });
  }
});

// ByBit endpoints
app.get('/proxy/bybit/funding-rate', async (req, res) => {
  try {
    const symbol = req.query.symbol || 'BTCUSDT';
    const limit = req.query.limit || 50;
    
    const response = await axios.get(`https://api.bybit.com/derivatives/v3/public/funding/history-funding-rate`, {
      params: { category: 'linear', symbol, limit }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Bybit:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch from Bybit API',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Crypto API Proxy server running on port ${PORT}`);
});
