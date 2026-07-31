require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

app.use(cors());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use(express.json());
const os = require('os');
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.setHeader('X-Served-By', os.hostname());
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Health check - useful for load balancer checks
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Core API endpoint: takes today's business stats, returns plain-language advice
app.post('/api/advice', async (req, res) => {
  try {
    const { todayProfit, todaySales, todayExpenses, weekProfits, topCategory } = req.body;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server is missing an API key. Contact the site owner.' });
    }

    // Simple rule-based observation to ground the AI advice in real numbers
    const trend = weekProfits && weekProfits.length >= 2
      ? (weekProfits[weekProfits.length - 1] >= weekProfits[0] ? 'improving' : 'declining')
      : 'not enough data yet';

    const prompt = `You are a friendly business helper for a small shop owner in a rural area who may not read well.
Give ONE short, practical, encouraging tip (max 2 short sentences, simple words, no jargon) based on this data:
- Today's profit: ${todayProfit}
- Today's sales total: ${todaySales}
- Today's expenses total: ${todayExpenses}
- This week's profit trend: ${trend}
- Best-selling category: ${topCategory || 'unknown'}
Speak directly to the shop owner. Do not use bullet points or markdown. Keep it under 30 words.`;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(502).json({ error: 'Could not reach the advice service. Please try again.' });
    }

    const adviceText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || "Keep track of your sales daily, you're building good habits!";

    res.json({ advice: adviceText, trend });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong generating advice. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Duka Buddy server running on port ${PORT}`);
});
