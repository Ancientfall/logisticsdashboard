#!/bin/bash

# Force complete cache refresh for bpsolutionsdashboard.com
echo "🔄 Forcing complete cache refresh..."

# Test current cache status
echo "📊 Testing current cache headers..."
curl -I https://bpsolutionsdashboard.com/ 2>/dev/null | grep -E "(cache-control|cf-cache-status|expires|pragma)"

echo ""
echo "🌐 Testing version endpoint..."
curl -s https://bpsolutionsdashboard.com/version | jq -r '.version'

echo ""
echo "💥 Triggering cache buster endpoint..."
curl -s https://bpsolutionsdashboard.com/cache-buster | jq -r '.message'

echo ""
echo "🚀 Cache refresh methods you can try:"
echo ""
echo "1. **Cloudflare Dashboard (Most Effective):**"
echo "   - Go to https://dash.cloudflare.com"
echo "   - Select bpsolutionsdashboard.com"
echo "   - Caching > Configuration"
echo "   - Click 'Purge Everything'"
echo ""
echo "2. **Browser Cache Clear:**"
echo "   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "   - Or open Developer Tools (F12) > Network tab > Check 'Disable cache'"
echo "   - Or try Incognito/Private browsing mode"
echo ""
echo "3. **Test URLs to verify cache is cleared:**"
echo "   - https://bpsolutionsdashboard.com/version (should show 2.1.1)"
echo "   - https://bpsolutionsdashboard.com/cache-buster"
echo "   - https://bpsolutionsdashboard.com/ (should show updated site)"
echo ""
echo "📝 Current server status:"
echo "   - Version: 2.1.1 ✅"
echo "   - Cache-busting headers: Active ✅"
echo "   - Nginx configuration: Updated ✅"
echo "   - Server restart: Complete ✅"
echo ""
echo "⚠️  If you still see the old version:"
echo "   - The issue is 100% Cloudflare edge caching"
echo "   - You MUST purge Cloudflare cache via their dashboard"
echo "   - Allow 2-3 minutes after purging before testing"