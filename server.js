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

// ========================================
// QUESTION 1: Basic User Creation
// ========================================
app.post('/check-solution', async (req, res) => {
    console.log('Checking Question 1...');
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
        console.log('Question 1 result:', allPassed);
        res.json({
            success: allPassed,
            checks: checks
        });
    } catch (error) {
        console.error('Error in check-solution:', error);
        res.status(500).json({
            success: false,
            checks: [{
                name: 'Error',
                passed: false,
                message: 'Server error: ' + error.message
            }]
        });
    }
});

// ========================================
// QUESTION 2: Multiple Groups
// ========================================
app.post('/check-question-2', async (req, res) => {
    console.log('Checking Question 2...');
    try {
        const checks = [];
        
        // Check user exists
        const userOutput = await execCommand('id admin_user 2>&1');
        const userExists = !userOutput.includes('no such user');
        
        checks.push({
            name: 'User "admin_user" exists',
            passed: userExists,
            message: userExists ? '✓ User exists' : '✗ User not found'
        });
        
        if (userExists) {
            // Check UID
            const uidMatch = userOutput.match(/uid=(\d+)/);
            const uid = uidMatch ? uidMatch[1] : null;
            checks.push({
                name: 'UID is 3000',
                passed: uid === '3000',
                message: uid === '3000' ? '✓ Correct UID' : `✗ UID is ${uid}, should be 3000`
            });
            
            // Check primary group
            const gidMatch = userOutput.match(/gid=\d+\((\w+)\)/);
            const primaryGroup = gidMatch ? gidMatch[1] : null;
            checks.push({
                name: 'Primary group is "sysadmin"',
                passed: primaryGroup === 'sysadmin',
                message: primaryGroup === 'sysadmin' ? '✓ Correct primary group' : `✗ Group is ${primaryGroup}`
            });
            
            // Check secondary groups
            const groupsOutput = await execCommand('groups admin_user');
            const hasWheel = groupsOutput.includes('wheel');
            const hasDocker = groupsOutput.includes('docker');
            
            checks.push({
                name: 'Member of "wheel" group',
                passed: hasWheel,
                message: hasWheel ? '✓ In wheel group' : '✗ Not in wheel group'
            });
            
            checks.push({
                name: 'Member of "docker" group',
                passed: hasDocker,
                message: hasDocker ? '✓ In docker group' : '✗ Not in docker group'
            });
            
            // Check home and shell
            const passwdOutput = await execCommand('getent passwd admin_user');
            if (passwdOutput) {
                const parts = passwdOutput.split(':');
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
        }
        
        const allPassed = checks.every(c => c.passed);
        console.log('Question 2 result:', allPassed);
        res.json({
            success: allPassed,
            checks: checks
        });
    } catch (error) {
        console.error('Error in check-question-2:', error);
        res.status(500).json({
            success: false,
            checks: [{
                name: 'Error',
                passed: false,
                message: 'Server error: ' + error.message
            }]
        });
    }
});

// ========================================
// QUESTION 3: System Service Account
// ========================================
app.post('/check-question-3', async (req, res) => {
    console.log('Checking Question 3...');
    try {
        const checks = [];
        
        // Check user exists
        const userOutput = await execCommand('id webapp 2>&1');
        const userExists = !userOutput.includes('no such user');
        
        checks.push({
            name: 'User "webapp" exists',
            passed: userExists,
            message: userExists ? '✓ User exists' : '✗ User not found'
        });
        
        if (userExists) {
            // Check UID (should be < 1000 for system account)
            const uidMatch = userOutput.match(/uid=(\d+)/);
            const uid = uidMatch ? parseInt(uidMatch[1]) : null;
            const isSystemUID = uid && uid < 1000;
            
            checks.push({
                name: 'UID below 1000 (system account)',
                passed: isSystemUID,
                message: isSystemUID ? `✓ System UID: ${uid}` : `✗ UID is ${uid}, should be < 1000`
            });
            
            // Check home and shell
            const passwdOutput = await execCommand('getent passwd webapp');
            if (passwdOutput) {
                const parts = passwdOutput.split(':');
                const home = parts[5];
                const shell = parts[6]?.trim();
                
                checks.push({
                    name: 'Home directory is /var/www/webapp',
                    passed: home === '/var/www/webapp',
                    message: home === '/var/www/webapp' ? '✓ Correct home' : `✗ Home is ${home}`
                });
                
                const isNoLogin = shell === '/sbin/nologin' || shell === '/usr/sbin/nologin';
                checks.push({
                    name: 'Shell is /sbin/nologin',
                    passed: isNoLogin,
                    message: isNoLogin ? '✓ No login shell' : `✗ Shell is ${shell}`
                });
            }
            
            checks.push({
                name: 'Created as system account (-r flag)',
                passed: isSystemUID,
                message: isSystemUID ? '✓ System account' : '✗ Not a system account'
            });
        }
        
        const allPassed = checks.every(c => c.passed);
        console.log('Question 3 result:', allPassed);
        res.json({
            success: allPassed,
            checks: checks
        });
    } catch (error) {
        console.error('Error in check-question-3:', error);
        res.status(500).json({
            success: false,
            checks: [{
                name: 'Error',
                passed: false,
                message: 'Server error: ' + error.message
            }]
        });
    }
});

// ========================================
// QUESTION 4: Modify User Properties
// ========================================
app.post('/check-question-4', async (req, res) => {
    console.log('Checking Question 4...');
    try {
        const checks = [];
        
        // Check user exists
        const userOutput = await execCommand('id testuser 2>&1');
        const userExists = !userOutput.includes('no such user');
        
        checks.push({
            name: 'User "testuser" exists',
            passed: userExists,
            message: userExists ? '✓ User exists' : '✗ User not found'
        });
        
        if (userExists) {
            // Check shell
            const passwdOutput = await execCommand('getent passwd testuser');
            if (passwdOutput) {
                const parts = passwdOutput.split(':');
                const home = parts[5];
                const shell = parts[6]?.trim();
                const comment = parts[4];
                
                checks.push({
                    name: 'Shell is /bin/zsh',
                    passed: shell === '/bin/zsh',
                    message: shell === '/bin/zsh' ? '✓ Correct shell' : `✗ Shell is ${shell}`
                });
                
                checks.push({
                    name: 'Home directory is /opt/testuser',
                    passed: home === '/opt/testuser',
                    message: home === '/opt/testuser' ? '✓ Correct home' : `✗ Home is ${home}`
                });
                
                checks.push({
                    name: 'Comment is "Modified Test User"',
                    passed: comment === 'Modified Test User',
                    message: comment === 'Modified Test User' ? '✓ Correct comment' : `✗ Comment is "${comment}"`
                });
            }
            
            // Check if added to testgroup
            const groupsOutput = await execCommand('groups testuser');
            const inTestGroup = groupsOutput.includes('testgroup');
            
            checks.push({
                name: 'Added to "testgroup"',
                passed: inTestGroup,
                message: inTestGroup ? '✓ In testgroup' : '✗ Not in testgroup'
            });
        }
        
        const allPassed = checks.every(c => c.passed);
        console.log('Question 4 result:', allPassed);
        res.json({
            success: allPassed,
            checks: checks
        });
    } catch (error) {
        console.error('Error in check-question-4:', error);
        res.status(500).json({
            success: false,
            checks: [{
                name: 'Error',
                passed: false,
                message: 'Server error: ' + error.message
            }]
        });
    }
});

// ========================================
// QUESTION 5: Password Expiration
// ========================================
app.post('/check-question-5', async (req, res) => {
    console.log('Checking Question 5...');
    try {
        const checks = [];
        
        // Check user exists
        const userOutput = await execCommand('id contractor 2>&1');
        const userExists = !userOutput.includes('no such user');
        
        checks.push({
            name: 'User "contractor" exists',
            passed: userExists,
            message: userExists ? '✓ User exists' : '✗ User not found'
        });
        
        if (userExists) {
            // Check UID
            const uidMatch = userOutput.match(/uid=(\d+)/);
            const uid = uidMatch ? uidMatch[1] : null;
            checks.push({
                name: 'UID is 5000',
                passed: uid === '5000',
                message: uid === '5000' ? '✓ Correct UID' : `✗ UID is ${uid}`
            });
            
            // Check password aging
            const chageOutput = await execCommand('sudo chage -l contractor 2>&1');
            
            // Check account expiration
            const expiryMatch = chageOutput.match(/Account expires\s*:\s*(.+)/i);
            const hasExpiry = expiryMatch && (expiryMatch[1].includes('2025') || expiryMatch[1].includes('Dec 31, 2025'));
            
            checks.push({
                name: 'Account expires in 2025',
                passed: hasExpiry,
                message: hasExpiry ? '✓ Expiration date set' : '✗ Expiration date not set correctly'
            });
            
            // Check max password age
            const maxDaysMatch = chageOutput.match(/Maximum number of days between password change\s*:\s*(\d+)/i);
            const maxDays = maxDaysMatch ? maxDaysMatch[1] : null;
            
            checks.push({
                name: 'Password max age is 30 days',
                passed: maxDays === '30',
                message: maxDays === '30' ? '✓ Max age: 30 days' : `✗ Max age is ${maxDays} days`
            });
            
            // Check warning days
            const warnMatch = chageOutput.match(/Number of days of warning before password expires\s*:\s*(\d+)/i);
            const warnDays = warnMatch ? warnMatch[1] : null;
            
            checks.push({
                name: 'Password warning is 7 days',
                passed: warnDays === '7',
                message: warnDays === '7' ? '✓ Warning: 7 days' : `✗ Warning is ${warnDays} days`
            });
        }
        
        const allPassed = checks.every(c => c.passed);
        console.log('Question 5 result:', allPassed);
        res.json({
            success: allPassed,
            checks: checks
        });
    } catch (error) {
        console.error('Error in check-question-5:', error);
        res.status(500).json({
            success: false,
            checks: [{
                name: 'Error',
                passed: false,
                message: 'Server error: ' + error.message
            }]
        });
    }
});

// ========================================
// UTILITY ENDPOINTS
// ========================================

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

// Reset all
app.post('/reset', async (req, res) => {
    try {
        await execCommand('userdel -r john_dev 2>/dev/null; groupdel developers 2>/dev/null');
        res.json({ 
            output: 'Lab environment reset successfully',
            success: true 
        });
    } catch (error) {
        res.json({ 
            output: 'Reset completed',
            success: true 
        });
    }
});

// Reset specific question
app.post('/reset-question', async (req, res) => {
    console.log('Reset question request:', req.body);
    const { questionId, cleanupCommands } = req.body;
    
    try {
        if (cleanupCommands) {
            await execCommand(cleanupCommands + ' 2>/dev/null');
        }
        res.json({ 
            output: `Question ${questionId} reset successfully`,
            success: true 
        });
    } catch (error) {
        res.json({ 
            output: 'Reset completed',
            success: true 
        });
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 RHEL User Lab Server running on http://localhost:${PORT}`);
    console.log(`📝 Make sure to run this with appropriate permissions (sudo if needed)`);
    console.log(`🔌 WebSocket server ready for terminal connections`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  POST /check-solution      - Question 1');
    console.log('  POST /check-question-2    - Question 2');
    console.log('  POST /check-question-3    - Question 3');
    console.log('  POST /check-question-4    - Question 4');
    console.log('  POST /check-question-5    - Question 5');
    console.log('  POST /reset-question      - Reset specific question');
    console.log('  POST /reset               - Reset all');
    console.log('  GET  /system-info         - Get system info');
    console.log('');
});
