# iOS Build Setup Guide

Build Unity + Expo iOS trên GitHub Actions (macOS runner), deploy lên iPhone 14 Pro trên Mac M4.

---

## Overview

```
GitHub Actions (macOS-14 runner)
    │
    ├─ Job 1: unity-ios-build
    │     └─ Unity 6000.3.20f1 → iOS Player
    │           → UnityFramework.framework + Data/
    │
    ├─ Job 2: expo-ios-build (depends on job 1)
    │     ├─ npx expo prebuild --platform ios
    │     ├─ Copy Unity framework vào Xcode project
    │     ├─ pod install
    │     └─ xcodebuild → .app bundle
    │
    └─ Job 3: package-for-device (depends on job 2)
          └─ Zip tất cả → `deploy-package` artifact

Mac M4:
    └─ Download deploy-package artifact
          ├─ Open .xcworkspace in Xcode
          └─ Build & Run on iPhone 14 Pro
```

---

## Prerequisites

### 1. Unity License

**Không cần license trả phí.** Workflow dùng `game-ci/unity-builder` — nó tự động xử lý Unity Personal license (miễn phí).

- **Free tier**: 5 builds/tháng
- **Đủ để test** iOS build và mapping lên iPhone 14 Pro

Không cần thêm bất kỳ secret nào vào GitHub.

### 2. GitHub Repository

Đảm bảo Unity project đã được push lên GitHub:

```bash
cd mobile/unity
git add .
git commit -m "Initial Unity project"
git push origin <your-branch>
```

### 3. Mac M4 Requirements

- Xcode 15+ (để open .xcworkspace)
- iPhone 14 Pro connected hoặc ready để deploy
- Apple Developer Account (để code sign)

---

## How to Trigger the Build

### Option A: GitHub Web UI (Recommended)

1. Mở repo trên GitHub
2. Go to **Actions** tab
3. Chọn workflow **"Unity iOS Build + Expo iOS"**
4. Click **"Run workflow"**
5. Chọn:
   - `unity_version`: `6000.3.20f1` (mặc định)
   - `build_type`: `full`
6. Click **"Run workflow"**

### Option B: GitHub CLI

```bash
gh workflow run unity-ios-build.yml \
  --field build_type=full \
  --field unity_version=6000.3.20f1
```

### Build Types

| Value | Mô tả |
|-------|--------|
| `full` | Unity + Expo (cần cả hai) |
| `unity-only` | Chỉ build Unity iOS framework |
| `expo-only` | Chỉ Expo prebuild + xcodebuild (giả định Unity đã có) |

---

## Monitoring the Build

1. **Actions tab** → Click on running workflow
2. Xem logs real-time của từng job
3. Estimated time:
   - `unity-ios-build`: ~20-40 phút (lần đầu, download Unity)
   - `expo-ios-build`: ~10-20 phút
   - `package-for-device`: ~2-5 phút

---

## Downloading the Build

### Step 1: Download artifact

1. Vào **Actions** tab
2. Click vào completed workflow run
3. Scroll xuống **Artifacts** section
4. Download **`deploy-package`**

### Step 2: Extract

```bash
# On Mac M4 terminal
cd ~/Downloads
unzip deploy-package.zip
cd deploy-package
ls -la
```

### Step 3: Contents

```
deploy-package/
├── README.md                    # Hướng dẫn deploy
├── ios/                         # Expo prebuild output
│   └── build/                   # Built .app bundle
│       └── Build/Products/
│           └── Debug-iphoneos/
│               └── app.app      # iOS app bundle
├── UnityBuild/                  # Unity framework
│   └── ...
└── rn-source/                   # React Native source
    └── ...
```

---

## Deploy to iPhone 14 Pro

### Option 1: Xcode GUI (Easiest)

1. **Open Xcode**
2. **File → Open** → Select `ios/*.xcworkspace`
3. Connect iPhone 14 Pro via USB
4. If prompted: **Trust this computer** on iPhone
5. In Xcode, select **iPhone 14 Pro** as target device
6. Select a **Team** (Sign & Capabilities tab)
7. Click **▶ Run** (top left)

### Option 2: Command Line

```bash
cd ~/Downloads/deploy-package/ios

# Find UDID of iPhone
system_profiler SPUSBDataType | grep -A 5 "iPhone"

# Or install via tools
brew install libimobiledevice
idevice_id -l

# Deploy (requires code signing)
xcodebuild \
  -workspace *.xcworkspace \
  -scheme app \
  -configuration Release \
  -destination 'platform=iOS,id=<YOUR_IPHONE_UDID>' \
  CODE_SIGN_IDENTITY="Apple Development: your.name@email.com" \
  PROVISIONING_PROFILE_SPECIFIER="Your Provisioning Profile" \
  install
```

### Option 3: Over-The-Air (if App Store Connect configured)

1. Archive the app in Xcode (Product → Archive)
2. Distribute via App Store Connect

---

## Troubleshooting

### "UnityFramework.framework not found"

Unity iOS build có thể output sang thư mục khác. Kiểm tra:

```bash
# Trong artifact, tìm đúng đường dẫn:
find . -name "UnityFramework.framework" -type d
```

Fix: Copy thủ công vào Xcode project:
1. Xcode → Project navigator
2. Right-click project → **Add Files to "app"**
3. Add `UnityFramework.framework` (check **"Copy items"**)
4. Add `Data/` folder (as **Folder Reference**, not Group)

### Code Signing Error

```
"No valid signing certificate"
```

1. Xcode → Preferences → Accounts
2. Add Apple Developer account
3. In project, select **Sign & Capabilities**
4. Choose correct **Team**
5. Set **Signing Certificate** to "Apple Development" or "iOS Developer"

### Pod install fails

```bash
cd ios
pod deintegrate
pod install --repo-update
```

### "No devices found" in Xcode

1. Connect iPhone via USB
2. On iPhone: Settings → Privacy & Security → Developer Mode → ON
3. On iPhone: Trust this Computer
4. Xcode: Window → Devices and Simulators → iPhone should appear

---

## CI Cost Estimation

| Runner | Minutes/Job | Approx Cost |
|--------|------------|-------------|
| macos-14 (M1) | ~30-60 min/job | ~$0.08-0.16/min = ~$2.40-9.60/job |
| Total (full build) | ~60-80 min | ~$5-13 total |

> GitHub Free tier: 2000 min/month shared across all workflows.

---

## Updating Unity Version

Đổi version trong workflow dispatch:

```
unity_version: 6000.3.20f1 → 6000.4.0f1
```

Hoặc update default trong workflow file:
```yaml
env:
  UNITY_VERSION: '6000.4.0f1'
```
