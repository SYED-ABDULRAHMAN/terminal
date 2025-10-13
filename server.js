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

// -----------------------------
// ✅ CHECK QUESTION 2 - Multiple Groups
// -----------------------------
app.post('/check-question-2', async (req, res) => {
    try {
        const checks = [];
        const userOutput = await execCommand('id admin_user 2>&1');
        const groupOutput = await execCommand('getent group sysadmin');

        const userExists = !userOutput.includes('no such user');
        const groupExists = groupOutput.includes('sysadmin');

        checks.push({
            name: 'User "admin_user" exists',
            passed: userExists,
            message: userExists ? '✓ User exists' : '✗ User not found'
        });

        checks.push({
            name: 'Primary group "sysadmin" exists',
            passed: groupExists,
            message: groupExists ? '✓ Group exists' : '✗ Group not found'
        });

        if (userExists) {
            const uidMatch = userOutput.match(/uid=(\d+)/);
            const uid = uidMatch ? uidMatch[1] : null;

            checks.push({
                name: 'UID is 3000',
                passed: uid === '3000',
                message: uid === '3000' ? '✓ Correct UID' : `✗ UID is ${uid}`
            });

            const primaryGroup = userOutput.match(/gid=\d+\((\w+)\)/)?.[1];
            checks.push({
                name: 'Primary group is "sysadmin"',
                passed: primaryGroup === 'sysadmin',
                message: primaryGroup === 'sysadmin' ? '✓ Correct primary group' : `✗ Found ${primaryGroup}`
            });

            const hasWheel = userOutput.includes('wheel');
            const hasDocker = userOutput.includes('docker');

            checks.push({
                name: 'Member of groups "wheel" and "docker"',
                passed: hasWheel && hasDocker,
                message: hasWheel && hasDocker ? '✓ Both groups assigned' : '✗ Missing wheel or docker group'
            });

            const passwd = await execCommand('getent passwd admin_user');
            const parts = passwd.split(':');
            const home = parts[5];
            const shell = parts[6]?.trim();

            checks.push({
                name: 'Home directory is /home/admin_user',
                passed: home === '/home/admin_user',
                message: home === '/home/admin_user' ? '✓ Correct home' : `✗ Home is ${home}`
            });

            checks.push({
                name: 'Shell is /bin/bash',
                passed: shell === '/bin/bash',
                message: shell === '/bin/bash' ? '✓ Correct shell' : `✗ Shell is ${shell}`
            });
        }

        res.json({
            success: checks.every(c => c.passed),
            checks
        });
    } catch (err) {
        res.json({ success: false, checks: [], error: err.message });
    }
});


// -----------------------------
// ✅ CHECK QUESTION 3 - System Account
// -----------------------------
app.post('/check-question-3', async (req, res) => {
    try {
        const checks = [];
        const output = await execCommand('getent passwd webapp 2>/dev/null');
        const userExists = output.includes('webapp');

        checks.push({
            name: 'User "webapp" exists',
            passed: userExists,
            message: userExists ? '✓ User exists' : '✗ User not found'
        });

        if (userExists) {
            const uidMatch = output.match(/:x:(\d+):/);
            const uid = uidMatch ? parseInt(uidMatch[1]) : null;
            checks.push({
                name: 'UID below 1000 (system user)',
                passed: uid && uid < 1000,
                message: uid && uid < 1000 ? `✓ UID ${uid}` : `✗ UID is ${uid}`
            });

            checks.push({
                name: 'Home directory is /var/www/webapp',
                passed: output.includes('/var/www/webapp'),
                message: output.includes('/var/www/webapp') ? '✓ Correct home' : '✗ Incorrect home'
            });

            checks.push({
                name: 'Shell is /sbin/nologin',
                passed: output.includes('/sbin/nologin'),
                message: output.includes('/sbin/nologin') ? '✓ Correct shell' : '✗ Incorrect shell'
            });
        }

        res.json({
            success: checks.every(c => c.passed),
            checks
        });
    } catch (err) {
        res.json({ success: false, checks: [], error: err.message });
    }
});


// -----------------------------
// ✅ CHECK QUESTION 4 - Modify User Properties
// -----------------------------
app.post('/check-question-4', async (req, res) => {
    try {
        const checks = [];
        const passwdOutput = await execCommand('getent passwd testuser 2>/dev/null');
        const groupsOutput = await execCommand('groups testuser 2>/dev/null');
        const userExists = passwdOutput.includes('testuser');

        checks.push({
            name: 'User "testuser" exists',
            passed: userExists,
            message: userExists ? '✓ User exists' : '✗ User not found'
        });

        if (userExists) {
            const parts = passwdOutput.split(':');
            const home = parts[5];
            const shell = parts[6]?.trim();
            const comment = parts[4];

            checks.push({
                name: 'Shell changed to /bin/zsh',
                passed: shell === '/bin/zsh',
                message: shell === '/bin/zsh' ? '✓ Correct shell' : `✗ Found ${shell}`
            });

            checks.push({
                name: 'Home directory changed to /opt/testuser',
                passed: home === '/opt/testuser',
                message: home === '/opt/testuser' ? '✓ Correct home' : `✗ Found ${home}`
            });

            checks.push({
                name: 'Comment is "Modified Test User"',
                passed: comment.includes('Modified Test User'),
                message: comment.includes('Modified Test User') ? '✓ Correct comment' : `✗ Found ${comment}`
            });

            const inGroup = groupsOutput.includes('testgroup');
            checks.push({
                name: 'Added to group "testgroup"',
                passed: inGroup,
                message: inGroup ? '✓ Group membership correct' : '✗ Not in testgroup'
            });
        }

        res.json({
            success: checks.every(c => c.passed),
            checks
        });
    } catch (err) {
        res.json({ success: false, checks: [], error: err.message });
    }
});


// -----------------------------
// ✅ CHECK QUESTION 5 - Password Expiration
// -----------------------------
app.post('/check-question-5', async (req, res) => {
    try {
        const checks = [];
        const passwdOutput = await execCommand('getent passwd contractor 2>/dev/null');
        const chageOutput = await execCommand('sudo chage -l contractor 2>/dev/null');
        const userExists = passwdOutput.includes('contractor');

        checks.push({
            name: 'User "contractor" exists',
            passed: userExists,
            message: userExists ? '✓ User exists' : '✗ User not found'
        });

        if (userExists) {
            const uidMatch = passwdOutput.match(/:x:(\d+):/);
            const uid = uidMatch ? uidMatch[1] : null;
            checks.push({
                name: 'UID is 5000',
                passed: uid === '5000',
                message: uid === '5000' ? '✓ Correct UID' : `✗ Found UID ${uid}`
            });

            const expires = chageOutput.includes('2025-12-31') || chageOutput.includes('Dec 31, 2025');
            checks.push({
                name: 'Account expires on 2025-12-31',
                passed: expires,
                message: expires ? '✓ Correct expiry date' : '✗ Wrong or missing expiry date'
            });

            const maxDays = chageOutput.match(/Maximum number of days.*: (\d+)/)?.[1];
            checks.push({
                name: 'Password max age is 30 days',
                passed: maxDays === '30',
                message: maxDays === '30' ? '✓ Correct max age' : `✗ Found ${maxDays}`
            });

            const warnDays = chageOutput.match(/Number of days of warning.*: (\d+)/)?.[1];
            checks.push({
                name: 'Password warning is 7 days',
                passed: warnDays === '7',
                message: warnDays === '7' ? '✓ Correct warning days' : `✗ Found ${warnDays}`
            });
        }

        res.json({
            success: checks.every(c => c.passed),
            checks
        });
    } catch (err) {
        res.json({ success: false, checks: [], error: err.message });
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
