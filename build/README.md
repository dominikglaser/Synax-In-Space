# Build Configuration

## Code Signing Setup

### macOS Code Signing (Apple Developer Account)

1. **Install Developer ID Certificate**:
   - Log in to [Apple Developer Portal](https://developer.apple.com)
   - Go to Certificates, Identifiers & Profiles
   - Create a "Developer ID Application" certificate
   - Download and install it in Keychain Access

2. **Configure Team ID**:
   - Find your Team ID in Apple Developer Portal (under Membership)
   - Update `package.json` → `build.mac.notarize.teamId` with your Team ID
   - Or set environment variable: `export APPLE_TEAM_ID=YOUR_TEAM_ID`

3. **Notarization Credentials**:
   - Create an App-Specific Password in [Apple ID Account](https://appleid.apple.com)
   - Set environment variables:
     ```bash
     export APPLE_ID=your@email.com
     export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
     ```

4. **Build**:
   ```bash
   npm run build:mac
   ```

### Windows Code Signing (Currently Unsigned)

Windows builds are currently unsigned. Users will see a SmartScreen warning on first launch.

To add code signing later:
1. Purchase a code signing certificate from a trusted CA
2. Update `package.json` → `build.win.certificateFile` and `certificatePassword`
3. Rebuild Windows executables

## Building Executables

### Build for macOS (Universal Binary):
```bash
npm run build:mac
```
Output: `release/Synax In Space-1.0.0-universal.dmg` (single DMG that works on both Intel and Apple Silicon Macs)

### Build for Windows:
```bash
npm run build:win
```
Output: `release/Synax In Space Setup 1.0.0.exe`

### Build for All Platforms:
```bash
npm run build:all
```

## Icons

Icons are generated from `assets/logo/appicon.png` or a placeholder.

To regenerate icons:
```bash
npm run icons
```

## Troubleshooting

### macOS Code Signing Issues:
- Ensure Developer ID certificate is in Keychain
- Check Team ID is correct
- Verify notarization credentials are set
- Check Keychain Access for certificate validity

### Build Failures:
- Ensure all dependencies are installed: `npm install`
- Check that Vite build succeeds: `npm run build`
- Verify Electron is installed: `npm list electron`

