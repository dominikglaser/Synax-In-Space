# Desktop Executable Build Guide

## Quick Start

### Build for macOS (Universal - Intel + Apple Silicon):
```bash
npm run build:mac
```

### Build for Windows:
```bash
npm run build:win
```

### Build for All Platforms:
```bash
npm run build:all
```

## Prerequisites

### macOS Code Signing Setup

1. **Install Developer ID Certificate**:
   - Log in to [Apple Developer Portal](https://developer.apple.com/account)
   - Create a "Developer ID Application" certificate
   - Install it in Keychain Access

2. **Set Environment Variables**:
   ```bash
   export APPLE_TEAM_ID=YOUR_TEAM_ID
   export APPLE_ID=your@email.com
   export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

3. **Find Team ID**:
   - Go to Apple Developer Portal → Membership
   - Copy your Team ID

4. **Create App-Specific Password**:
   - Go to [Apple ID Account](https://appleid.apple.com)
   - Security → App-Specific Passwords
   - Generate password for "Electron Builder"

### Windows Build

No special setup required. Builds will be unsigned (SmartScreen warning expected).

## Build Outputs

### macOS:
- `release/Synax In Space-1.0.0-universal.dmg` - Universal binary (works on Intel and Apple Silicon)
- `release/Synax In Space.app` - Application bundle

### Windows:
- `release/Synax In Space Setup 1.0.0.exe` - NSIS installer

## Testing Locally

### Run Electron App:
```bash
npm run build
npm run electron
```

### Development Mode (with hot reload):
```bash
npm run electron:dev
```

## Code Signing Status

- ✅ **macOS**: Configured for Apple Developer account signing
- ⚠️ **Windows**: Unsigned (SmartScreen warning on first launch)

## Troubleshooting

See `build/BUILD_INSTRUCTIONS.md` for detailed troubleshooting guide.

