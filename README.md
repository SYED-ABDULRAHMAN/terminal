Prerequisite and to run the application commands

apt npm install

npm install node-pty ws

sudo apt-get install -y make python3 build-essential

npm install node-pty ws


sudo node server.js


Linux User Creation Learning Tool
📖 What Is This Project?

This is a web-based learning tool that teaches you how to create users in Linux (RHEL/Ubuntu) interactively.

It includes:

🌐 Frontend (Website) – What you see in your browser

⚙️ Backend (Server) – Runs real Linux commands

💻 Real Terminal – A live bash terminal inside your browser using xterm.js

🏗️ Project Architecture
┌─────────────────────────────────────────────────────────┐
│ YOUR BROWSER                                            │
│ ┌──────────────────────────────────────────────────┐     │
│ │ Web Interface (HTML + CSS + JavaScript)          │     │
│ │ - Shows task instructions                        │     │
│ │ - Displays terminal (xterm.js)                   │     │
│ │ - Check/Reset buttons                            │     │
│ └──────────────────────────────────────────────────┘     │
│             ↕  HTTP Requests & WebSocket                 │
└─────────────────────────────────────────────────────────┘
              ↕
┌─────────────────────────────────────────────────────────┐
│ NODE.JS SERVER (server.js)                              │
│ ┌──────────────────────────────────────────────────┐     │
│ │ Express Web Server (Port 3000)                   │     │
│ │ - Serves HTML files                              │     │
│ │ - Handles API requests                           │     │
│ │                                                  │     │
│ │ WebSocket Server                                 │     │
│ │ - Real-time terminal connection                  │     │
│ │                                                  │     │
│ │ node-pty (Pseudo Terminal)                       │     │
│ │ - Creates real bash shell                        │     │
│ └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
              ↕
┌─────────────────────────────────────────────────────────┐
│ YOUR LINUX SYSTEM                                       │
│ - Real bash shell runs here                             │
│ - Commands execute (groupadd, useradd, etc.)            │
│ - Files/users are created on your system                │
└─────────────────────────────────────────────────────────┘

📁 Project Structure
rhel-user-lab/
├── package.json       # Lists all dependencies
├── server.js          # Main backend logic
├── public/            # Files served to browser
│   └── index.html     # Main webpage
└── node_modules/      # Installed libraries (created via npm install)

📦 Dependencies
{
  "dependencies": {
    "express": "Web server framework",
    "cors": "Allows browser-server communication",
    "node-pty": "Creates real terminals",
    "ws": "WebSocket for real-time communication"
  }
}


Think of package.json as a recipe that tells npm what ingredients (libraries) to download.

🧠 server.js (The Backend Brain)
1️⃣ Import Libraries
const express = require('express');
const pty = require('node-pty');
const WebSocket = require('ws');


Loads essential tools like the web server, terminal spawner, and WebSocket communication.

2️⃣ Create Web Server
const app = express();
const PORT = 3000;
app.use(express.static('public'));


Serves HTML files from the public folder and listens on port 3000.

3️⃣ WebSocket Server (Real-Time Terminal)
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  const term = pty.spawn('bash', [], { cols: 80, rows: 24 });

  term.on('data', (data) => ws.send(JSON.stringify({ type: 'output', data })));

  ws.on('message', (message) => {
    const msg = JSON.parse(message);
    if (msg.type === 'input') term.write(msg.data);
  });
});


This connects your browser’s terminal directly to a real bash shell on your Linux system.

4️⃣ API Endpoints
✅ Check Solution
app.post('/check-solution', async (req, res) => {
  const userOutput = await execCommand('id john_dev 2>&1');
  const userExists = !userOutput.includes('no such user');
  const uid = userOutput.match(/uid=(\d+)/)[1];
  const isCorrect = uid === '2500';
  res.json({ success: isCorrect });
});


Verifies if the correct user was created.

🔄 Reset Environment
app.post('/reset', async (req, res) => {
  await execCommand('userdel -r john_dev; groupdel developers');
  res.json({ success: true });
});


Deletes created users and groups for a clean restart.

🎨 index.html (The Frontend Face)

Displays:

Task instructions

Interactive terminal (via xterm.js)

“Check Solution” and “Reset” buttons

Terminal Setup
term = new Terminal({ cursorBlink: true, fontSize: 14 });
term.open(document.getElementById('terminal'));


Creates the visible terminal window.

WebSocket Connection
socket = new WebSocket('ws://localhost:3000');

socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  term.write(msg.data);
};

term.onData((data) => {
  socket.send(JSON.stringify({ type: 'input', data }));
});


Handles two-way real-time communication between browser and server.

🔄 Command Flow Example (ls -la)
1️⃣ You type "ls -la" in browser terminal
2️⃣ xterm.js captures it → sends to server via WebSocket
3️⃣ node-pty writes it into real bash
4️⃣ Bash executes → returns output
5️⃣ Output sent back → displayed in browser terminal


⏱️ Happens in just 50–100 milliseconds!

🧰 Key Technologies
Technology	Purpose	Analogy
Node.js	Runs JavaScript on server	A translator between JS and OS
Express	Web framework	Restaurant manager handling orders
WebSocket	Real-time communication	A phone call instead of sending letters
node-pty	Pseudo-terminal creation	Opens a terminal programmatically
xterm.js	Terminal emulator in browser	A screen showing the real terminal
🧩 How “Check Solution” Works

You click Check Solution

JavaScript sends a POST request → /check-solution

Server runs validation commands

Parses results (uid, gid, user existence)

Returns JSON result

Browser displays ✅ or ❌ message

🚀 Setup Instructions
Step 1️⃣ Install Dependencies
npm install


Downloads all required libraries from the internet.

Step 2️⃣ Start Server (with sudo)
sudo node server.js


Starts Express + WebSocket server

Creates real bash shell for interaction

Step 3️⃣ Open in Browser

Go to:
👉 http://localhost:3000

You’ll see:

The task instructions

A live Linux terminal

Buttons to Check and Reset

🧩 Summary of Flow

Browser → Sends input

Node.js (WebSocket) → Relays to bash

Linux Bash → Executes command

Output → Sent back and displayed instantly
