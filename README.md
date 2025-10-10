Prerequisite and to run the application commands

apt npm install

npm install node-pty ws

sudo apt-get install -y make python3 build-essential

npm install node-pty ws


sudo node server.js


📖 What Is This Project?

This is a web-based learning tool that teaches you how to create users in Linux (RHEL/Ubuntu). It has:

A website (frontend) - What you see in your browser

A server (backend) - Runs commands on your Linux machine

A real terminal - Like opening a terminal on your Linux, but in your browser!



🏗️ Project Architecture (How It Works)

┌─────────────────────────────────────────────────────────┐

│                    YOUR BROWSER                         │

│  ┌──────────────────────────────────────────────────┐  │

│  │  Web Interface (HTML + CSS + JavaScript)         │  │

│  │  - Shows task instructions                       │  │

│  │  - Displays terminal (xterm.js)                  │  │

│  │  - Check/Reset buttons                           │  │


│  └──────────────────────────────────────────────────┘  │

│                          ↕                              │


│              HTTP Requests & WebSocket                  │

└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              NODE.JS SERVER (server.js)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Express Web Server (Port 3000)                  │  │
│  │  - Serves HTML files                             │  │
│  │  - Handles API requests                          │  │
│  │                                                   │  │
│  │  WebSocket Server                                │  │
│  │  - Real-time terminal connection                 │  │
│  │                                                   │  │
│  │  node-pty (Pseudo Terminal)                      │  │
│  │  - Creates real bash shell                       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              YOUR LINUX SYSTEM                          │
│  - Real bash shell running                              │
│  - Commands execute here (groupadd, useradd, etc.)     │
│  - Files/users actually created on your system         │
└─────────────────────────────────────────────────────────┘

📁 Project Files Explained
rhel-user-lab/
├── package.json          # Lists all dependencies (like a shopping list)
├── server.js            # The brain - runs the server and terminal
├── public/              # Files sent to browser
│   └── index.html       # The webpage you see
└── node_modules/        # Downloaded libraries (created by npm install)
1. package.json - The Shopping List
json{
  "dependencies": {
    "express": "Web server framework",
    "cors": "Allows browser to talk to server",
    "node-pty": "Creates real terminals",
    "ws": "WebSocket for real-time communication"
  }
}
Think of it as: A recipe that tells npm what ingredients (libraries) to download.

2. server.js - The Brain (Backend)
Let me break down what each part does:
Part 1: Import Libraries
javascriptconst express = require('express');    // Web server
const pty = require('node-pty');       // Terminal creator
const WebSocket = require('ws');       // Real-time connection
What it does: Load the tools we need (like getting tools from a toolbox)

Part 2: Create Web Server
javascriptconst app = express();
const PORT = 3000;
app.use(express.static('public'));  // Serve HTML files from 'public' folder
What it does: Creates a web server that listens on port 3000 and serves your HTML files
Analogy: Like opening a shop on street number 3000 that displays your products (HTML pages)

Part 3: WebSocket Server (Real-Time Communication)
javascriptconst wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    // Create a real terminal
    const term = pty.spawn('bash', [], {
        cols: 80,
        rows: 24
    });
    
    // When terminal outputs something, send to browser
    term.on('data', (data) => {
        ws.send(JSON.stringify({ type: 'output', data: data }));
    });
    
    // When browser sends input, write to terminal
    ws.on('message', (message) => {
        const msg = JSON.parse(message);
        if (msg.type === 'input') {
            term.write(msg.data);  // Type into terminal
        }
    });
});
What it does:

Browser connects → Create a real bash terminal
You type in browser → Send to bash terminal
Bash outputs something → Send back to browser
Browser displays it in real-time

Analogy: Like a phone call between your browser and Linux terminal - everything you say goes instantly to the other side!

Part 4: API Endpoints
Check Solution Endpoint:
javascriptapp.post('/check-solution', async (req, res) => {
    // Run commands to check if user exists
    const userOutput = await execCommand('id john_dev 2>&1');
    const userExists = !userOutput.includes('no such user');
    
    // Check if UID is 2500
    const uid = userOutput.match(/uid=(\d+)/)[1];
    const isCorrect = uid === '2500';
    
    // Send results back to browser
    res.json({ success: isCorrect });
});
What it does: Verifies if you created the user correctly

Reset Endpoint:
javascriptapp.post('/reset', async (req, res) => {
    // Delete user and group
    await execCommand('userdel -r john_dev; groupdel developers');
    res.json({ success: true });
});
What it does: Cleans up by deleting the user and group you created

3. index.html - The Face (Frontend)
Part 1: HTML Structure
html<div class="content">
    <!-- Left side: Instructions -->
    <div class="question-panel">
        <h2>Task</h2>
        <p>Create user john_dev...</p>
        <button onclick="checkSolution()">Check Solution</button>
    </div>
    
    <!-- Right side: Terminal -->
    <div class="terminal-panel">
        <div id="terminal"></div>
    </div>
</div>
What it does: Creates the layout - instructions on left, terminal on right

Part 2: Terminal Setup (JavaScript)
javascript// Create terminal instance
term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    theme: { background: '#000000' }
});

// Open terminal in the div
term.open(document.getElementById('terminal'));
What it does: Creates the visual terminal you see in the browser (using xterm.js library)

Part 3: WebSocket Connection
javascript// Connect to server
socket = new WebSocket('ws://localhost:3000');

// When connected
socket.onopen = () => {
    term.writeln('✓ Connected!');
};

// When server sends data
socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    term.write(msg.data);  // Display in terminal
};

// When you type in terminal
term.onData((data) => {
    socket.send(JSON.stringify({
        type: 'input',
        data: data
    }));
});
What it does:

Opens a connection to the server
When you type → Send to server
When server responds → Display in terminal

Analogy: Like a two-way radio - you talk, they hear; they talk, you hear!

🔄 Complete Flow: What Happens When You Type a Command
Let's trace what happens when you type: ls -la
1. YOU TYPE: "ls -la" in browser terminal
   ↓
2. XTERM.JS: Captures keystrokes
   ↓
3. JAVASCRIPT: 
   - Collects characters: "ls -la"
   - Wraps in JSON: { type: 'input', data: 'ls -la' }
   ↓
4. WEBSOCKET: Sends JSON to server over network
   ↓
5. SERVER.JS (Node.js):
   - Receives: { type: 'input', data: 'ls -la' }
   - Extracts: 'ls -la'
   ↓
6. NODE-PTY: Writes 'ls -la' to real bash terminal
   ↓
7. BASH (Linux): 
   - Executes 'ls -la' command
   - Generates output (list of files)
   ↓
8. NODE-PTY: Captures bash output
   ↓
9. SERVER.JS: 
   - Receives output from bash
   - Wraps in JSON: { type: 'output', data: 'file1\nfile2...' }
   ↓
10. WEBSOCKET: Sends JSON back to browser
    ↓
11. JAVASCRIPT: Receives JSON, extracts data
    ↓
12. XTERM.JS: Displays output in terminal
    ↓
13. YOU SEE: List of files in the terminal!
Total time: About 50-100 milliseconds! ⚡

🔧 Key Technologies Explained
1. Node.js

What: JavaScript runtime (lets you run JavaScript outside browser)
Why: So you can write server code in JavaScript
Analogy: Like a translator that lets JavaScript talk to your operating system

2. Express

What: Web framework for Node.js
Why: Makes it easy to create web servers and handle requests
Analogy: Like a restaurant manager - takes orders (requests) and delivers food (responses)

3. WebSocket (ws)

What: Two-way communication channel
Why: HTTP is one request = one response. WebSocket stays open for continuous chat
Analogy:

HTTP = Sending letters (wait for reply)
WebSocket = Phone call (instant back-and-forth)



4. node-pty

What: Creates pseudo-terminals (PTY)
Why: Lets you create real terminal sessions programmatically
Analogy: Like opening a terminal window, but controlled by code instead of clicking

5. xterm.js

What: Terminal emulator for browsers
Why: Browsers can't display terminals natively
Analogy: Like a TV screen that shows what's happening in the real terminal


🎯 How Check Solution Works
When you click "Check Solution":
javascript// 1. Button clicked
onclick="checkSolution()"

// 2. JavaScript sends HTTP request
fetch('http://localhost:3000/check-solution', { method: 'POST' })

// 3. Server receives request
app.post('/check-solution', async (req, res) => {
    
    // 4. Run commands to check
    const groupCheck = await execCommand('getent group developers');
    const userCheck = await execCommand('id john_dev');
    
    // 5. Parse output
    const groupExists = groupCheck.includes('developers');
    const gidCorrect = groupCheck.includes(':3000:');
    const uidCorrect = userCheck.includes('uid=2500');
    
    // 6. Create results
    const checks = [
        { name: 'Group exists', passed: groupExists },
        { name: 'GID is 3000', passed: gidCorrect },
        { name: 'UID is 2500', passed: uidCorrect }
    ];
    
    // 7. Send results back
    res.json({ success: allPassed, checks: checks });
});

// 8. Browser receives results
const data = await response.json();

// 9. Display results
if (data.success) {
    result.innerHTML = '🎉 Success!';
} else {
    result.innerHTML = '❌ Issues found...';
}

🚀 Setup Process Explained
Step 1: npm install
bashnpm install
What happens:

Reads package.json
Downloads all libraries from internet
Saves them in node_modules/ folder
Creates package-lock.json (exact versions used)

Analogy: Like going to the store with your shopping list and buying everything

Step 2: sudo node server.js
bashsudo node server.js
What happens:

sudo = Run with administrator privileges (needed to create users)
node = Start Node.js runtime
server.js = Load and execute this file

Then:

Express server starts on port 3000
WebSocket server starts
Waits for browser connections

Analogy: Like opening your shop and waiting for customers

Step 3: Open browser to localhost:3000
What happens:

Browser sends request to http://localhost:3000
Server receives request
Server sends index.html file
Browser loads HTML, CSS, JavaScript
JavaScript creates terminal (xterm.js)
JavaScript opens WebSocket connection
Server creates real bash terminal (node-pty)
Connection established - you can now type!

