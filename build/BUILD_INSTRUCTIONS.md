# Build Instructions for Desktop Executables

## Prerequisites

### macOS Build:
- ✅ Apple Developer account ($99/year) - You have this
- Developer ID Application certificate installed in Keychain
- Xcode Command Line Tools: `xcode-select --install`
- Notarization credentials (App-Specific Password)

### Windows Build:
- No special requirements (unsigned build)
- Can be built on macOS (electron-builder handles cross-compilation)

## Setup Code Signing (macOS)

### 1. Install Developer ID Certificate

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **+** to create a new certificate
4. Select **Developer ID Application** (for distribution outside App Store)
5. Follow the instructions to create a Certificate Signing Request (CSR)
6. Download the certificate and double-click to install in Keychain

### 2. Find Your Team ID

1. In Apple Developer Portal, go to **Membership**
2. Copy your **Team ID** (format: `XXXXXXXXXX`)

### 3. Set Environment Variables

Create a `.env` file in the project root (or export in your shell):

```bash
# Required for code signing
export APPLE_TEAM_ID=YOUR_TEAM_ID_HERE

# Required for notarization
export APPLE_ID=your@email.com
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

**To create App-Specific Password:**
1. Go to [Apple ID Account](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Go to **Security** → **App-Specific Passwords**
4. Generate a new password for "Electron Builder"
5. Copy the password (format: `xxxx-xxxx-xxxx-xxxx`)

### 4. Update package.json (Optional)

Alternatively, you can hardcode your Team ID in `package.json`:
```json
"notarize": {
  "teamId": "YOUR_TEAM_ID_HERE"
}
```

## Building Executables

### Build for macOS (Universal Binary - Intel + Apple Silicon):

```bash
npm run build:mac
```

This will create:
- `release/Synax In Space-1.0.0-x64.dmg` (Intel Mac)
- `release/Synax In Space-1.0.0-arm64.dmg` (Apple Silicon Mac)
- Universal binary that works on both architectures

**Note:** Code signing and notarization happen automatically if credentials are set.

### Build for Windows:

```bash
npm run build:win
```

This will create:
- `release/Synax In Space Setup 1.0.0.exe` (NSIS installer)

**Note:** Windows build is unsigned. Users will see SmartScreen warning on first launch.

### Build for All Platforms:

```bash
npm run build:all
```

## Testing the Build

### Test Electron App Locally:

```bash
# Build web app first
npm run build

# Run Electron
npm run electron
```

### Test Development Mode:

```bash
npm run electron:dev
```

This starts Vite dev server and Electron together.

## Distribution

### macOS Distribution:

1. **DMG File**: Share the `.dmg` file directly
   - Users double-click to mount
   - Drag app to Applications folder
   - No code signing warnings (if properly signed)

2. **App Store** (Optional):
   - Requires additional App Store certificate
   - Update `build.mac.target` to include `mas` target
   - Submit through App Store Connect

### Windows Distribution:

1. **NSIS Installer**: Share the `.exe` file
   - Users run installer
   - Standard installation wizard
   - Creates desktop shortcut
   - **Note:** Unsigned builds show SmartScreen warning (expected)

## Troubleshooting

### macOS Code Signing Issues:

**Error: "No identity found"**
- Solution: Ensure Developer ID certificate is in Keychain
- Check: `security find-identity -v -p codesigning`

**Error: "Notarization failed"**
- Solution: Verify APPLE_ID and APPLE_APP_SPECIFIC_PASSWORD are set
- Check: Credentials are correct in Apple ID account

**Error: "Team ID not found"**
- Solution: Set APPLE_TEAM_ID environment variable
- Or update `package.json` → `build.mac.notarize.teamId`

### Build Failures:

**Error: "Cannot find module 'electron'"**
- Solution: `npm install`

**Error: "Vite build failed"**
- Solution: Run `npm run build` separately to see detailed errors

**Error: "Icon not found"**
- Solution: Run `npm run icons` to generate icons

### Windows Build on macOS:

If building Windows on macOS fails:
- Install Wine: `brew install wine-stable`
- Or build on a Windows machine directly

## File Structure

```
release/
├── Synax In Space-1.0.0-x64.dmg      # macOS Intel
├── Synax In Space-1.0.0-arm64.dmg    # macOS Apple Silicon
└── Synax In Space Setup 1.0.0.exe    # Windows installer
```

## Next Steps

1. ✅ Set up Apple Developer credentials
2. ✅ Run `npm run build:mac` to test macOS build
3. ✅ Run `npm run build:win` to test Windows build
4. ✅ Test executables on target platforms
5. ✅ Distribute to users

