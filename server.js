// server.js - Backend Server with Real PTY Terminal
const express = require('express');
const { spawn } = require('child_process');
const pty = require('node-pty');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store terminals
const terminals = {};
let terminalId = 0;

// WebSocket connection for terminal
wss.on('connection', (ws) => {
    console.log('Client connected to terminal');
    
    // Create a new terminal
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const term = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || process.cwd(),
        env: process.env
    });
    
    const id = terminalId++;
    terminals[id] = term;
    
    console.log(`Created terminal ${id} with PID ${term.pid}`);
    
    // Send terminal output to client
    term.on('data', (data) => {
        try {
            ws.send(JSON.stringify({ type: 'output', data: data }));
        } catch (e) {
            // Client disconnected
        }
    });
    
    // Receive input from client
    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);
            if (msg.type === 'input') {
                term.write(msg.data);
            } else if (msg.type === 'resize') {
                term.resize(msg.cols, msg.rows);
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });
    
    // Clean up on disconnect
    ws.on('close', () => {
        console.log(`Client disconnected, closing terminal ${id}`);
        term.kill();
        delete terminals[id];
    });
    
    // Handle terminal exit
    term.on('exit', (code) => {
        console.log(`Terminal ${id} exited with code ${code}`);
        try {
            ws.send(JSON.stringify({ type: 'exit', code: code }));
            ws.close();
        } catch (e) {
            // Already closed
        }
        delete terminals[id];
    });
});

// Helper function to execute commands and return output
function execCommand(command) {
    return new Promise((resolve, reject) => {
        const shell = spawn('bash', ['-c', command]);
        let output = '';
        let errorOutput = '';
        
        shell.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        shell.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        shell.on('close', (code) => {
            resolve(output || errorOutput || '');
        });
        
        shell.on('error', (err) => {
            reject(err);
        });
        
        setTimeout(() => {
            shell.kill();
            resolve(output || 'timeout');
        }, 5000);
    });
}

// Check solution endpoint
app.post('/check-solution', async (req, res) => {
    try {
        const checks = [];
        
        // Check if developers group exists with GID 3000
        const groupOutput = await execCommand('getent group developers');
        const groupExists = groupOutput.includes('developers');
        const correctGID = groupOutput.includes(':3000:');
        
        checks.push({
            name: 'Group "developers" exists',
            passed: groupExists,
            message: groupExists ? '✓ Group exists' : '✗ Group not found'
        });
        
        checks.push({
            name: 'Group GID is 3000',
            passed: correctGID,
            message: correctGID ? '✓ Correct GID' : '✗ GID should be 3000'
        });
        
        // Check user
        const userOutput = await execCommand('id john_dev 2>&1');
        const userExists = !userOutput.includes('no such user');
        
        checks.push({
            name: 'User "john_dev" exists',
            passed: userExists,
            message: userExists ? '✓ User exists' : '✗ User not found'
        });
        
        if (userExists) {
            // Check UID
            const uidMatch = userOutput.match(/uid=(\d+)/);
            const uid = uidMatch ? uidMatch[1] : null;
            checks.push({
                name: 'UID is 2500',
                passed: uid === '2500',
                message: uid === '2500' ? '✓ Correct UID' : `✗ UID is ${uid}, should be 2500`
            });
            
            // Check primary group
            const gidMatch = userOutput.match(/gid=\d+\((\w+)\)/);
            const primaryGroup = gidMatch ? gidMatch[1] : null;
            checks.push({
                name: 'Primary group is "developers"',
                passed: primaryGroup === 'developers',
                message: primaryGroup === 'developers' ? '✓ Correct group' : `✗ Group is ${primaryGroup}`
            });
            
            // Check home directory and shell
            const passwdOutput = await execCommand('getent passwd john_dev');
            if (passwdOutput) {
                const parts = passwdOutput.split(':');
                const home = parts[5];
                const shell = parts[6]?.trim();
                const comment = parts[4];
                
                checks.push({
                    name: 'Home directory is /home/john_dev',
                    passed: home === '/home/john_dev',
                    message: home === '/home/john_dev' ? '✓ Correct home' : `✗ Home is ${home}`
                });
                
                checks.push({
                    name: 'Shell is /bin/bash',
                    passed: shell === '/bin/bash',
                    message: shell === '/bin/bash' ? '✓ Correct shell' : `✗ Shell is ${shell}`
                });
                
                checks.push({
                    name: 'Comment contains "Developer"',
                    passed: comment?.includes('Developer'),
                    message: comment?.includes('Developer') ? '✓ Correct comment' : `✗ Comment: ${comment}`
                });
            }
        }
        
        const allPassed = checks.every(c => c.passed);
        res.json({
            success: allPassed,
            checks: checks
        });
    } catch (error) {
        res.json({
            success: false,
            checks: [],
            error: error.message
        });
    }
});

// Get system info
app.get('/system-info', async (req, res) => {
    try {
        const info = await execCommand('cat /etc/os-release 2>/dev/null | grep PRETTY_NAME || echo "PRETTY_NAME=\\"Linux System\\""');
        res.json({
            osInfo: info.replace('PRETTY_NAME=', '').replace(/"/g, '').trim() || 'Linux System',
            user: process.env.USER || process.env.USERNAME || 'root',
            hostname: os.hostname()
        });
    } catch (error) {
        res.json({
            osInfo: 'Linux System',
            user: process.env.USER || 'root',
            hostname: os.hostname()
        });
    }
});

// Reset (remove user and group)
app.post('/reset', async (req, res) => {
    try {
        await execCommand('userdel -r john_dev 2>/dev/null; groupdel developers 2>/dev/null');
        res.json({ 
            output: 'Lab environment reset successfully',
            success: true 
        });
    } catch (error) {
        res.json({ 
            output: 'Reset completed (some resources may not have existed)',
            success: true 
        });
    }
});

server.listen(PORT, () => {
    console.log(`🚀 RHEL User Lab Server running on http://localhost:${PORT}`);
    console.log(`📝 Make sure to run this with appropriate permissions (sudo if needed)`);
    console.log(`🔌 WebSocket server ready for terminal connections`);
});// server.js - Backend Server with Real PTY Terminal
const express = require('express');
const { spawn } = require('child_process');
const pty = require('node-pty');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store terminals
const terminals = {};
let terminalId = 0;

// WebSocket connection for terminal
wss.on('connection', (ws) => {
    console.log('Client connected to terminal');
    
    // Create a new terminal
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const term = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || process.cwd(),
        env: process.env
    });
    
    const id = terminalId++;
    terminals[id] = term;
    
    console.log(`Created terminal ${id} with PID ${term.pid}`);
    
    // Send terminal output to client
    term.on('data', (data) => {
        try {
            ws.send(JSON.stringify({ type: 'output', data: data }));
        } catch (e) {
            // Client disconnected
        }
    });
    
    // Receive input from client
    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);
            if (msg.type === 'input') {
                term.write(msg.data);
            } else if (msg.type === 'resize') {
                term.resize(msg.cols, msg.rows);
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });
    
    // Clean up on disconnect
    ws.on('close', () => {
        console.log(`Client disconnected, closing terminal ${id}`);
        term.kill();
        delete terminals[id];
    });
    
    // Handle terminal exit
    term.on('exit', (code) => {
        console.log(`Terminal ${id} exited with code ${code}`);
        try {
            ws.send(JSON.stringify({ type: 'exit', code: code }));
            ws.close();
        } catch (e) {
            // Already closed
        }
        delete terminals[id];
    });
});

// Helper function to execute commands and return output
function execCommand(command) {
    return new Promise((resolve, reject) => {
        const shell = spawn('bash', ['-c', command]);
        let output = '';
        let errorOutput = '';
        
        shell.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        shell.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        shell.on('close', (code) => {
            resolve(output || errorOutput || '');
        });
        
        shell.on('error', (err) => {
            reject(err);
        });
        
        setTimeout(() => {
            shell.kill();
            resolve(output || 'timeout');
        }, 5000);
    });
}

// Check solution endpoint
app.post('/check-solution', async (req, res) => {
    try {
        const checks = [];
        
        // Check if developers group exists with GID 3000
        const groupOutput = await execCommand('getent group developers');
        const groupExists = groupOutput.includes('developers');
        const correctGID = groupOutput.includes(':3000:');
        
        checks.push({
            name: 'Group "developers" exists',
            passed: groupExists,
            message: groupExists ? '✓ Group exists' : '✗ Group not found'
        });
        
        checks.push({
            name: 'Group GID is 3000',
            passed: correctGID,
            message: correctGID ? '✓ Correct GID' : '✗ GID should be 3000'
        });
        
        // Check user
        const userOutput = await execCommand('id john_dev 2>&1');
        const userExists = !userOutput.includes('no such user');
        
        checks.push({
            name: 'User "john_dev" exists',
            passed: userExists,
            message: userExists ? '✓ User exists' : '✗ User not found'
        });
        
        if (userExists) {
            // Check UID
            const uidMatch = userOutput.match(/uid=(\d+)/);
            const uid = uidMatch ? uidMatch[1] : null;
            checks.push({
                name: 'UID is 2500',
                passed: uid === '2500',
                message: uid === '2500' ? '✓ Correct UID' : `✗ UID is ${uid}, should be 2500`
            });
            
            // Check primary group
            const gidMatch = userOutput.match(/gid=\d+\((\w+)\)/);
            const primaryGroup = gidMatch ? gidMatch[1] : null;
            checks.push({
                name: 'Primary group is "developers"',
                passed: primaryGroup === 'developers',
                message: primaryGroup === 'developers' ? '✓ Correct group' : `✗ Group is ${primaryGroup}`
            });
            
            // Check home directory and shell
            const passwdOutput = await execCommand('getent passwd john_dev');
            if (passwdOutput) {
                const parts = passwdOutput.split(':');
                const home = parts[5];
                const shell = parts[6]?.trim();
                const comment = parts[4];
                
                checks.push({
                    name: 'Home directory is /home/john_dev',
                    passed: home === '/home/john_dev',
                    message: home === '/home/john_dev' ? '✓ Correct home' : `✗ Home is ${home}`
                });
                
                checks.push({
                    name: 'Shell is /bin/bash',
                    passed: shell === '/bin/bash',
                    message: shell === '/bin/bash' ? '✓ Correct shell' : `✗ Shell is ${shell}`
                });
                
                checks.push({
                    name: 'Comment contains "Developer"',
                    passed: comment?.includes('Developer'),
                    message: comment?.includes('Developer') ? '✓ Correct comment' : `✗ Comment: ${comment}`
                });
            }
        }
        
        const allPassed = checks.every(c => c.passed);
        res.json({
            success: allPassed,
            checks: checks
        });
    } catch (error) {
        res.json({
            success: false,
            checks: [],
            error: error.message
        });
    }
});

// Get system info
app.get('/system-info', async (req, res) => {
    try {
        const info = await execCommand('cat /etc/os-release 2>/dev/null | grep PRETTY_NAME || echo "PRETTY_NAME=\\"Linux System\\""');
        res.json({
            osInfo: info.replace('PRETTY_NAME=', '').replace(/"/g, '').trim() || 'Linux System',
            user: process.env.USER || process.env.USERNAME || 'root',
            hostname: os.hostname()
        });
    } catch (error) {
        res.json({
            osInfo: 'Linux System',
            user: process.env.USER || 'root',
            hostname: os.hostname()
        });
    }
});

// Reset (remove user and group)
app.post('/reset', async (req, res) => {
    try {
        await execCommand('userdel -r john_dev 2>/dev/null; groupdel developers 2>/dev/null');
        res.json({ 
            output: 'Lab environment reset successfully',
            success: true 
        });
    } catch (error) {
        res.json({ 
            output: 'Reset completed (some resources may not have existed)',
            success: true 
        });
    }
});

server.listen(PORT, () => {
    console.log(`🚀 RHEL User Lab Server running on http://localhost:${PORT}`);
    console.log(`📝 Make sure to run this with appropriate permissions (sudo if needed)`);
    console.log(`🔌 WebSocket server ready for terminal connections`);
});
