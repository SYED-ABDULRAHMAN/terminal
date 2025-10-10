# 🐧 RHEL User Creation Lab

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Linux-blue.svg)](https://www.linux.org/)

> An interactive web-based laboratory for learning RHEL/Linux user and group management with a **real terminal** that executes commands on your actual Linux system.

![RHEL User Lab Demo](https://via.placeholder.com/800x400/667eea/ffffff?text=RHEL+User+Lab+Terminal)

---

## ✨ Features

- 🖥️ **Real Interactive Terminal** - Full bash terminal in your browser powered by xterm.js
- ⚡ **Live Command Execution** - Commands run on your actual Linux system in real-time
- 🎯 **Guided Learning** - Step-by-step instructions with clear requirements
- ✅ **Automated Verification** - Instant feedback on your solution
- 🔄 **Reset Functionality** - Clean up and practice again anytime
- 🔒 **Security Controls** - Dangerous commands are blocked
- 🎨 **Modern UI** - Beautiful, responsive interface
- 📱 **Mobile Friendly** - Works on any device

---

## 🎬 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/rhel-user-lab.git
cd rhel-user-lab

# Install dependencies
apt install npm

npm install node-pty ws

sudo apt-get install -y make python3 build-essential

npm install node-pty ws

# Start the server (requires sudo)
sudo node server.js

# Open browser
# Navigate to: http://localhost:3000
```

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Usage](#-usage)
- [The Challenge](#-the-challenge)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [API Documentation](#-api-documentation)
- [Technologies Used](#-technologies-used)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

---

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14.0.0 or higher)
- **npm** (comes with Node.js)
- **Linux System** (RHEL, CentOS, Ubuntu, Debian, or similar)
- **sudo privileges** (for user creation)
- **Build tools** (for node-pty compilation)

### Installing Build Tools

**Ubuntu/Debian:**
```bash
sudo apt-get install -y make python3 build-essential
```

**RHEL/CentOS/Fedora:**
```bash
sudo dnf groupinstall "Development Tools"
sudo dnf install python3
```

---

## 📦 Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/rhel-user-lab.git
cd rhel-user-lab
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- `express` - Web server framework
- `cors` - Cross-Origin Resource Sharing
- `node-pty` - Pseudo-terminal for Node.js
- `ws` - WebSocket library

### Step 3: Start the Server
```bash
sudo node server.js
```

You should see:
```
🚀 RHEL User Lab Server running on http://localhost:3000
📝 Make sure to run this with appropriate permissions (sudo if needed)
🔌 WebSocket server ready for terminal connections
```

### Step 4: Open in Browser
Navigate to: **http://localhost:3000**

---

## 🎯 Usage

### The Challenge

**Scenario:** You're a system administrator creating a developer account.

**Requirements:**
- **Username:** john_dev
- **UID:** 2500
- **Primary Group:** developers (GID: 3000)
- **Home Directory:** /home/john_dev
- **Shell:** /bin/bash
- **Comment:** Developer Account

### Solution

#### Step 1: Create the Group
```bash
sudo groupadd -g 3000 developers
```

#### Step 2: Create the User
```bash
sudo useradd -u 2500 -g developers -d /home/john_dev -s /bin/bash -c "Developer Account" john_dev
```

#### Step 3: Verify
```bash
id john_dev
getent passwd john_dev
```

#### Step 4: Check Your Solution
Click the **"✓ Check Solution"** button to verify all requirements are met!

---

## 📁 Project Structure

```
rhel-user-lab/
├── server.js              # Backend Node.js server
├── package.json           # Project dependencies
├── package-lock.json      # Dependency lock file
├── public/
│   └── index.html         # Frontend web interface
├── node_modules/          # Installed dependencies
├── README.md              # This file
└── LICENSE                # MIT License
```

---

## 🔍 How It Works

### Architecture Diagram

```
┌─────────────────────────────────────────┐
│          Web Browser (Client)           │
│  ┌───────────────────────────────────┐  │
│  │  HTML + CSS + JavaScript          │  │
│  │  - xterm.js (Terminal Display)    │  │
│  │  - WebSocket Client               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↕
          HTTP & WebSocket (Port 3000)
                    ↕
┌─────────────────────────────────────────┐
│         Node.js Server (Backend)        │
│  ┌───────────────────────────────────┐  │
│  │  Express.js (HTTP Server)         │  │
│  │  WebSocket Server (ws)            │  │
│  │  node-pty (PTY Management)        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│         Linux System (Host OS)          │
│  - Real bash shell processes            │
│  - User/Group management commands       │
│  - File system operations               │
└─────────────────────────────────────────┘
```

### Data Flow

1. **User types command** in browser terminal (xterm.js)
2. **WebSocket sends** command to Node.js server
3. **node-pty writes** command to real bash shell
4. **Bash executes** command on Linux system
5. **Output captured** by node-pty
6. **WebSocket sends** output back to browser
7. **xterm.js displays** output in terminal

---

## 📡 API Documentation

### WebSocket Events

#### Client → Server

**Input Data:**
```javascript
{
  "type": "input",
  "data": "ls -la\n"
}
```

**Resize Terminal:**
```javascript
{
  "type": "resize",
  "cols": 80,
  "rows": 24
}
```

#### Server → Client

**Output Data:**
```javascript
{
  "type": "output",
  "data": "file1.txt\nfile2.txt\n"
}
```

**Terminal Exit:**
```javascript
{
  "type": "exit",
  "code": 0
}
```

### HTTP Endpoints

#### `POST /check-solution`
Verifies if the user was created correctly.

**Response:**
```json
{
  "success": true,
  "checks": [
    {
      "name": "Group 'developers' exists",
      "passed": true,
      "message": "✓ Group exists"
    },
    {
      "name": "UID is 2500",
      "passed": true,
      "message": "✓ Correct UID"
    }
  ]
}
```

#### `POST /reset`
Removes the created user and group.

**Response:**
```json
{
  "output": "Lab environment reset successfully",
  "success": true
}
```

#### `GET /system-info`
Returns system information.

**Response:**
```json
{
  "osInfo": "Ubuntu 22.04.3 LTS",
  "user": "root",
  "hostname": "ubuntu"
}
```

---

## 🛠️ Technologies Used

### Backend
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[Express.js](https://expressjs.com/)** - Web framework
- **[node-pty](https://github.com/microsoft/node-pty)** - Pseudo-terminal for Node.js
- **[ws](https://github.com/websockets/ws)** - WebSocket library

### Frontend
- **[xterm.js](https://xtermjs.org/)** - Terminal emulator for the web
- **[xterm-addon-fit](https://github.com/xtermjs/xterm.js/tree/master/addons/xterm-addon-fit)** - Responsive terminal sizing
- **Vanilla JavaScript** - No framework dependencies
- **Modern CSS** - Gradient backgrounds, grid layout

---

## 🐛 Troubleshooting

### Server Won't Start

**Problem:** `Error: Cannot find module 'express'`

**Solution:**
```bash
npm install
```

---

**Problem:** Port 3000 already in use

**Solution:**
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Or change port in server.js
const PORT = 3001;
```

---

### node-pty Installation Fails

**Problem:** `gyp ERR! build error`

**Solution:**
```bash
# Install build tools
sudo apt-get install -y make python3 build-essential

# Clear npm cache
npm cache clean --force

# Reinstall
npm install node-pty
```

---

### Terminal Not Connecting

**Problem:** "Cannot connect to server"

**Solution:**
1. Ensure server is running: `sudo node server.js`
2. Check firewall settings
3. Verify port 3000 is accessible
4. Check browser console for errors (F12)

---

### Permission Denied Errors

**Problem:** Commands fail with permission errors

**Solution:**
```bash
# Make sure server runs with sudo
sudo node server.js

# Verify you're using sudo in commands
sudo groupadd -g 3000 developers
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Ideas for Contributions

- [ ] Add more user management exercises
- [ ] Implement password setting functionality
- [ ] Add SELinux context configuration
- [ ] Create sudo configuration tasks
- [ ] Add multi-language support
- [ ] Implement command history
- [ ] Add syntax highlighting
- [ ] Create Docker containerized version
- [ ] Add unit tests
- [ ] Create video tutorials

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 RHEL User Lab

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions...
```

---

## 🙏 Acknowledgments

- **[xterm.js](https://xtermjs.org/)** - For the amazing terminal emulator
- **[node-pty](https://github.com/microsoft/node-pty)** - For PTY support in Node.js
- **[Express.js](https://expressjs.com/)** - For the excellent web framework
- **Red Hat** - For RHEL and excellent documentation
- **Linux Foundation** - For Linux education resources

---

## 📚 Educational Resources

### Learn More About Linux User Management

- [RHEL 9 Documentation - Managing Users](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-users-from-the-command-line)
- [useradd Man Page](https://man7.org/linux/man-pages/man8/useradd.8.html)
- [groupadd Man Page](https://man7.org/linux/man-pages/man8/groupadd.8.html)
- [Linux User Management Guide](https://www.redhat.com/sysadmin/user-account-management)

### Certification Preparation

This tool is useful for preparing for:
- **RHCSA** (Red Hat Certified System Administrator)
- **LFCS** (Linux Foundation Certified System Administrator)
- **CompTIA Linux+**

---

## 📊 Project Stats

- **Lines of Code:** ~1,000
- **Dependencies:** 4
- **Supported OS:** Linux (RHEL, Ubuntu, CentOS, Debian, Fedora)
- **Browser Support:** Chrome, Firefox, Safari, Edge (Modern versions)

---

## 🔮 Roadmap

### Version 2.0 (Planned)
- [ ] Multiple user management exercises
- [ ] Password management tasks
- [ ] Group membership exercises
- [ ] Permission management challenges
- [ ] Progress tracking
- [ ] Leaderboard system

### Version 3.0 (Future)
- [ ] Docker support
- [ ] Cloud deployment options
- [ ] Multi-user collaborative mode
- [ ] Video tutorials
- [ ] Certificate generation
- [ ] Integration with LMS platforms

---

## 📞 Support

Having issues? We're here to help!

- 🐛 **Bug Reports:** [Open an issue](https://github.com/yourusername/rhel-user-lab/issues)
- 💡 **Feature Requests:** [Open an issue](https://github.com/yourusername/rhel-user-lab/issues)
- 📧 **Email:** your.email@example.com
- 💬 **Discussions:** [GitHub Discussions](https://github.com/yourusername/rhel-user-lab/discussions)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/rhel-user-lab&type=Date)](https://star-history.com/#yourusername/rhel-user-lab&Date)

---

## 📸 Screenshots

### Main Interface
![Main Interface](https://via.placeholder.com/800x450/667eea/ffffff?text=Main+Interface)

### Terminal in Action
![Terminal](https://via.placeholder.com/800x450/1e1e1e/00ff00?text=Terminal+View)

### Verification Results
![Verification](https://via.placeholder.com/800x450/d4edda/155724?text=Success+Screen)

---

<div align="center">

**Made with ❤️ for Linux learners everywhere**

[⬆ Back to Top](#-rhel-user-creation-lab)

</div>
