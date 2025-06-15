#!/bin/bash

# BP Logistics Dashboard - Deployment Verification Script
# This script checks if the deployment was successful

# Configuration
SERVER_IP="178.16.140.185"
BASE_URL="http://$SERVER_IP"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 BP Logistics Dashboard - Deployment Verification${NC}"
echo "=================================================="
echo "Testing deployment at: $BASE_URL"
echo ""

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test URL
test_url() {
    local url=$1
    local description=$2
    
    echo -n "Testing $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "200" ] || [ "$response" = "304" ]; then
        echo -e "${GREEN}✓ Pass${NC} (HTTP $response)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ Fail${NC} (HTTP $response)"
        ((TESTS_FAILED++))
    fi
}

# Function to test content
test_content() {
    local url=$1
    local search_string=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    content=$(curl -s "$url")
    
    if echo "$content" | grep -q "$search_string"; then
        echo -e "${GREEN}✓ Pass${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ Fail${NC}"
        ((TESTS_FAILED++))
    fi
}

echo "1. Basic Connectivity Tests"
echo "----------------------------"
test_url "$BASE_URL" "Homepage"
test_url "$BASE_URL/favicon.ico" "Favicon"
test_url "$BASE_URL/manifest.json" "Manifest"
test_url "$BASE_URL/logo192.png" "Logo 192x192"
test_url "$BASE_URL/test.html" "Test page"

echo ""
echo "2. Content Tests"
echo "----------------"
test_content "$BASE_URL" "<div id=\"root\">" "React root element"
test_content "$BASE_URL" "BP Logistics Dashboard" "Page title"
test_content "$BASE_URL/manifest.json" "BP Logistics Analytics" "Manifest content"

echo ""
echo "3. React Router Tests"
echo "---------------------"
echo "Testing client-side routing (should return main page for all routes)..."
test_url "$BASE_URL/dashboard" "Dashboard route"
test_url "$BASE_URL/upload" "Upload route"

echo ""
echo "4. Server Configuration"
echo "-----------------------"
echo -n "Checking nginx status... "
nginx_status=$(ssh root@$SERVER_IP "systemctl is-active nginx" 2>/dev/null)
if [ "$nginx_status" = "active" ]; then
    echo -e "${GREEN}✓ nginx is running${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ nginx is not running${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "5. Performance Check"
echo "--------------------"
echo -n "Testing load time... "
load_time=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL")
load_time_ms=$(echo "$load_time * 1000" | bc)
load_time_int=${load_time_ms%.*}

if [ "$load_time_int" -lt 2000 ]; then
    echo -e "${GREEN}✓ Good${NC} (${load_time_int}ms)"
    ((TESTS_PASSED++))
elif [ "$load_time_int" -lt 5000 ]; then
    echo -e "${YELLOW}⚠ Acceptable${NC} (${load_time_int}ms)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ Slow${NC} (${load_time_int}ms)"
    ((TESTS_FAILED++))
fi

echo ""
echo "======================================"
echo -e "Test Summary: ${GREEN}$TESTS_PASSED passed${NC}, ${RED}$TESTS_FAILED failed${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Deployment appears successful.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Open $BASE_URL in a browser"
    echo "  2. Test file upload functionality"
    echo "  3. Navigate through different dashboards"
    echo "  4. Check browser console for any errors"
else
    echo -e "${RED}⚠️  Some tests failed. Please investigate the issues above.${NC}"
    echo ""
    echo "Troubleshooting tips:"
    echo "  1. Check nginx error logs: ssh root@$SERVER_IP 'tail -f /var/log/nginx/error.log'"
    echo "  2. Verify files exist: ssh root@$SERVER_IP 'ls -la /var/www/logistics-dashboard/'"
    echo "  3. Check nginx config: ssh root@$SERVER_IP 'nginx -t'"
fi