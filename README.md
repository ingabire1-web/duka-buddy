Duka Buddy 🧺

A simple, accessible daily business tracker built for small-shop sellers in rural areas — especially those with limited literacy. Duka Buddy uses large icon-based buttons, minimal text, voice playback, and AI-generated daily advice to help shop owners understand how their business is doing and how to improve it, one day at a time.

Why this project exists

Many small business owners in rural areas keep no formal records of their daily sales and expenses, making it hard to spot trends, plan ahead, or get useful advice. Existing bookkeeping apps assume comfortable literacy and desktop-style interaction. Duka Buddy is designed around icons and voice instead of dense text and forms, so it can genuinely serve people who might otherwise be excluded from digital tools.

Features
Add Sale / Add Expense — large icon-based buttons, pick a category icon (food, clothes, tools, etc.) and enter an amount. No reading-heavy forms.
Today's Snapshot — profit, sales, and expenses shown clearly with color coding.
7-Day Trend — simple bar chart of daily profit over the past week.
Get Today's Tip — sends the day's stats to an AI model (Google Gemini) which returns one short, plain-language, encouraging suggestion.
Voice playback (🔊) — reads the daily summary and the AI tip aloud using the browser's built-in text-to-speech, so users don't need to read anything at all.
Local data storage — all transactions are saved in the browser's localStorage. No login, no server-side database, works offline except for the AI tip feature.
Tech Stack
Frontend: HTML, CSS, vanilla JavaScript (no framework, kept lightweight for low-resource devices)
Backend: Node.js + Express
External API: Google Gemini API — generates the daily business advice
Voice: Browser-native Web Speech API (SpeechSynthesis) — no external TTS API or key required
Process management (deployed servers): PM2
Load balancing: HAProxy
Part One: Running Locally
Prerequisites
Node.js (v18+) and npm installed
A free Google Gemini API key from aistudio.google.com/apikey
Setup
bash
git clone https://github.com/ingabire1-web/duka-buddy.git
cd duka-buddy
npm install
cp .env.example .env

Open .env and add your real Gemini API key:

GEMINI_API_KEY=your_actual_key_here
PORT=3000

Run it:

bash
npm start

Open your browser to http://localhost:3000.

Using the app
Tap Add Sale or Add Expense
Pick a category icon
Enter the amount, tap Save
Tap Get Today's Tip for AI-generated advice based on your day's numbers
Tap any 🔊 icon to hear a summary or tip read aloud
Part Two: Deployment

The app is deployed across two identical web servers, with a load balancer distributing traffic between them.

Architecture:

User → Lb01 (HAProxy, port 80) → round-robin → Web01 (Node app, port 3000)
                                              → Web02 (Node app, port 3000)
Deploying to each web server (Web01 and Web02)

On each server:

bash
sudo apt update
sudo apt install -y git nodejs npm

git clone https://github.com/ingabire1-web/duka-buddy.git
cd duka-buddy
npm install

echo "GEMINI_API_KEY=your_actual_key_here" > .env
echo "PORT=3000" >> .env

sudo npm install -g pm2
pm2 start server.js --name duka-buddy
pm2 save
pm2 startup   # then run the command it prints

Verify:

bash
curl http://localhost:3000/health
# should return: OK
Configuring the Load Balancer (Lb01)

Install HAProxy:

bash
sudo apt update
sudo apt install -y haproxy

Edit /etc/haproxy/haproxy.cfg and append:

frontend duka_buddy_front
    bind *:80
    default_backend duka_buddy_back

backend duka_buddy_back
    balance roundrobin
    option httpchk GET /health
    server web01 10.227.125.163:3000 check
    server web02 10.227.77.166:3000 check

Validate and restart:

bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
sudo systemctl restart haproxy
Verifying load balancing works

Each server adds an X-Served-By response header identifying itself (see server.js). Running this from any machine confirms traffic is being split between both servers:

bash
for i in {1..10}; do curl -sI http://<Lb01_public_IP>/ | grep -i "X-Served-By"; done

Expected result: the hostname alternates between the two web servers across the 10 requests, confirming round-robin distribution is working correctly.

The app is accessible at: http://<Lb01_public_IP>

API Credits

This project uses the Google Gemini API (gemini-flash-latest model) to generate daily business advice from the user's sales and expense data. Full credit to Google for providing free-tier access to this model. Documentation: https://ai.google.dev/gemini-api/docs

Text-to-speech is handled entirely client-side using the browser's native Web Speech API, requiring no external service or key.

Challenges & How They Were Solved
SSH key mismatch during initial server access: A newly generated keypair didn't match the one already authorized on the server. Solved by identifying the correct original keypair via fingerprint comparison (ssh-keygen -lf) and transferring the correct private key.
Modal popup appeared permanently visible/unclickable: A CSS rule (display: flex on .modal-overlay) was unintentionally overriding the HTML hidden attribute, so the popup was always rendered — before any category icons had been generated by JavaScript. Fixed with an explicit .modal-overlay[hidden] { display: none; } rule.
Gemini API model errors: Several model names (gemini-2.0-flash, gemini-1.5-flash, gemini-2.5-flash) returned quota or "no longer available to new users" errors. Resolved by querying the account's actual available models via the Gemini ListModels endpoint and switching to the gemini-flash-latest alias, which stays pointed at whichever model new accounts currently have access to.
Missing tools on fresh servers: git, nano, and Node.js were not pre-installed on the web servers and had to be installed manually before deployment could proceed.
Security Notes
API keys are never committed to this repository — .env is excluded via .gitignore, and only .env.example (with a placeholder) is tracked.
All sensitive credentials for grading are provided separately as instructed, not in this README or the public repo.
Demo Video

[Link to demo video — add here]

License / Acknowledgements

Built as part of the ALU System Engineering & DevOps coursework. Thanks to the Google Gemini team for free API access, and to the HAProxy and PM2 open-source projects.




Loadbalancing between web-01 and web-02

Step 1 — Add a "served by" header (on both Web01 and Web02)
bash
cd ~/duka-buddy
nano server.js

Find:

js
app.use(express.static(path.join(__dirname, 'public')));

Add just above it:

js
const os = require('os');
app.use((req, res, next) => {
  res.setHeader('X-Served-By', os.hostname());
  next();
});

Save, then:

bash
pm2 restart duka-buddy

Do this on both Web01 and Web02.

Step 2 — Prove round-robin balancing with a simple loop

From your own machine (or from Lb01), run:

bash
for i in {1..10}; do curl -sI http://<Lb01_public_IP>/ | grep -i "X-Served-By"; done

You should see the hostname alternate between your two web servers across the 10 requests — clean, undeniable proof of load balancing, and it's just a few lines of terminal output.
