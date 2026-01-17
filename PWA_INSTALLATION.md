# PWA Installation Instructions

## Overview
ImageSearchReverse is now a Progressive Web App (PWA) with offline capabilities and installable features.

## Installation Guide

### Desktop (Chrome/Edge)

1. **Visit the site**: Go to https://imagesearchreverse.com
2. **Look for install prompt**: Chrome will show an install icon in the address bar
3. **Click install**: Click the install icon or wait for the prompt
4. **Confirm**: Click "Install" in the dialog
5. **Launch**: The app will open in its own window

**Alternative method**:
1. Open Chrome menu (three dots)
2. Select "Install ImageSearchReverse"
3. Confirm installation

### Desktop (Firefox)

1. **Visit the site**: Go to https://imagesearchreverse.com
2. **Open menu**: Click the application menu (three lines)
3. **Select "Install"**: Choose "Install ImageSearchReverse"
4. **Confirm**: Click "Install" in the prompt

### Mobile (Android - Chrome)

1. **Visit the site**: Go to https://imagesearchreverse.com in Chrome
2. **Wait for prompt**: Chrome will show "Add to Home Screen" notification
3. **Tap "Add"**: Confirm installation
4. **Find the app**: Look for the ImageSearchReverse icon on your home screen

**Alternative method**:
1. Open Chrome menu (three dots)
2. Select "Add to Home Screen"
3. Tap "Add" to confirm

### Mobile (iOS - Safari)

1. **Visit the site**: Go to https://imagesearchreverse.com in Safari
2. **Tap Share button**: Look for the share icon (box with arrow)
3. **Scroll down**: Find "Add to Home Screen" option
4. **Tap "Add"**: Confirm by tapping "Add" in the top right
5. **Find the app**: The app icon will appear on your home screen

## PWA Features

### What You Get

1. **Offline Support**: The app works even without an internet connection (cached pages)
2. **App-like Experience**: Full-screen mode without browser UI
3. **Home Screen Icon**: Easy access from your device
4. **Fast Launch**: Optimized for quick loading
5. **Push Notifications** (Future): Optional updates and alerts

### Standalone Mode

When installed, the app runs in standalone mode:
- No address bar
- No browser buttons
- Dedicated window
- Focus mode for productivity

## Troubleshooting

### Install Prompt Not Showing

**Desktop**:
1. Clear browser cache and reload
2. Check if the site was previously dismissed (Chrome > Flags > PWA > Reset)
3. Ensure you're visiting the HTTPS version
4. Try in incognito mode (to rule out extensions)

**Mobile**:
1. Make sure you're using Chrome (Android) or Safari (iOS)
2. Clear browser data and try again
3. Ensure you have enough home screen space
4. Check iOS restrictions (Settings > Screen Time > Content Restrictions)

### Installation Failed

1. **Check HTTPS**: PWAs require HTTPS connection
2. **Verify Manifest**: Check browser console for manifest errors
3. **Service Worker**: Ensure service worker is registered
4. **Browser Support**: Verify your browser supports PWAs

### App Not Working After Install

1. **Clear Cache**: Clear app data and reinstall
2. **Update**: Uninstall and reinstall to get latest version
3. **Check Network**: Some features require internet connection
4. **Report Issue**: Contact support if problem persists

## Browser Compatibility

| Browser | Desktop Install | Mobile Install | Offline Support |
|---------|----------------|----------------|-----------------|
| Chrome  | ✅ Yes | ✅ Yes | ✅ Yes |
| Edge    | ✅ Yes | ✅ Yes | ✅ Yes |
| Firefox | ✅ Yes | ❌ No | ⚠️ Limited |
| Safari  | ❌ No | ✅ Yes | ⚠️ Limited |
| Opera   | ✅ Yes | ✅ Yes | ✅ Yes |

## Technical Details

### Manifest URL
```
https://imagesearchreverse.com/manifest.json
```

### Service Worker
Currently using Cloudflare Pages with built-in caching strategies.

### Icon Sizes
- 192x192px (Standard PWA)
- 512x512px (High-resolution)

### Theme Colors
- Background: #f6efe5 (sand)
- Theme: #f6efe5 (matching brand)

## Testing Installation

### Lighthouse Audit
1. Open Chrome DevTools (F12)
2. Go to Lighthouse tab
3. Select "Progressive Web App" checkbox
4. Click "Analyze page load"
5. Look for PWA score (should be 90+)

### Manual Testing
1. Open DevTools > Application
2. Check "Manifest" tab for valid manifest
3. Check "Service Workers" for active worker
4. Test offline mode in Network tab

## Updates

### Automatic Updates
The PWA checks for updates:
- On every launch (if connected to internet)
- Every 24 hours when installed
- When you manually refresh

### Manual Updates
1. Open the app
2. Close and reopen (triggers update check)
3. Or clear data and reinstall

## Uninstallation

### Desktop
1. Right-click the app icon
2. Select "Uninstall" or "Remove from Chrome"
3. Confirm uninstallation

### Mobile
1. Long-press the app icon
2. Select "Remove" or "Uninstall"
3. Confirm removal

## Developer Notes

### Adding Offline Support (Future)
To enable full offline support:
1. Implement service worker for API caching
2. Add offline fallback pages
3. Cache critical resources
4. Implement background sync

### Testing Offline Mode
1. Install the PWA
2. Turn off internet connection
3. Open the app
4. Test cached functionality

## Support

For issues or questions:
- Email: hello@imagesearchreverse.com
- GitHub: [repository issues]
- Documentation: /docs/pwa

## Resources

- [PWA Best Practices](https://web.dev/pwa/)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Install Criteria](https://web.dev/install-criteria/)
- [Next.js PWA Docs](https://nextjs.org/docs/app/building-your-application/configuring/pwa)
