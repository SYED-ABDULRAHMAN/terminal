#!/bin/bash
echo "=== Checking RHEL User Lab Setup ==="
echo ""

echo "1. Checking directory structure..."
ls -la ~/rhel-user-lab/

echo ""
echo "2. Checking if server.js exists..."
test -f ~/rhel-user-lab/server.js && echo "✓ server.js found" || echo "✗ server.js NOT found"

echo ""
echo "3. Checking if public/index.html exists..."
test -f ~/rhel-user-lab/public/index.html && echo "✓ index.html found" || echo "✗ index.html NOT found"

echo ""
echo "4. Checking if node_modules exists..."
test -d ~/rhel-user-lab/node_modules && echo "✓ node_modules found" || echo "✗ node_modules NOT found - run 'npm install'"

echo ""
echo "5. Checking if server is running..."
if sudo lsof -i :3000 > /dev/null 2>&1; then
    echo "✓ Server is running on port 3000"
else
    echo "✗ Server is NOT running - run 'sudo node server.js'"
fi

echo ""
echo "=== Next Steps ==="
echo "1. If server is not running: cd ~/rhel-user-lab && sudo node server.js"
echo "2. Open browser: http://localhost:3000"
