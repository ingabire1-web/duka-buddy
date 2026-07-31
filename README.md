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
