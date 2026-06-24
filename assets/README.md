# Assets

## App Icon Files

The app icon is maintained as static image assets. When the logo changes, update the SVG reference files first and export all derived PNG files together so the iOS, Android, splash, favicon, and store assets stay visually consistent.

Do not update only one icon PNG in isolation unless the change is intentionally platform-specific.

| File                                                    | Purpose                                 | Referenced by                                             |
| ------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| `assets/images/icon.png`                                | Full 1024px app icon export             | General Expo icon asset                                   |
| `assets/app.icon/Assets/icon-1770908038775.png`         | iOS app icon image                      | `app.json` via `ios.icon` and `assets/app.icon/icon.json` |
| `assets/app.icon/Assets/icon-dark.png`                  | iOS dark appearance app icon image      | `assets/app.icon/icon.json` via `appearance: "dark"`      |
| `assets/app.icon/Assets/icon-tinted.png`                | iOS tinted appearance app icon mask     | `assets/app.icon/icon.json` via `appearance: "tinted"`    |
| `assets/images/adaptive-icon.png`                       | Transparent Android adaptive foreground | `app.json` via `android.adaptiveIcon.foregroundImage`     |
| `assets/images/monochrome-icon.png`                     | Transparent Android themed icon mask    | `app.json` via `android.adaptiveIcon.monochromeImage`     |
| `assets/images/splash-icon.png`                         | Transparent splash screen foreground    | `app.json` via `expo-splash-screen.image`                 |
| `assets/images/favicon.png`                             | 48px web favicon                        | `app.json` via `web.favicon`                              |
| `assets/images/code-companion-logo-concept-preview.png` | 1024px review preview                   | Design review/export only                                 |
| `assets/images/code-companion-logo-play-store-512.png`  | 512px store listing export              | Play Store listing/upload reference                       |
| `assets/images/code-companion-logo-concept.svg`         | Full-background SVG reference           | Source/export reference                                   |
| `assets/images/code-companion-logo-foreground.svg`      | Transparent foreground SVG reference    | Source/export reference                                   |
| `assets/images/code-companion-logo-monochrome.svg`      | Monochrome SVG reference                | Source/export reference                                   |

Current logo colors:

| Token                | Value     |
| -------------------- | --------- |
| Background           | `#F7F8FA` |
| Dark icon background | `#111518` |
| DHBW red             | `#E9181D` |
| DHBW gray            | `#5C6971` |
| Dark icon gray       | `#AAB4BA` |

Keep `assets/app.icon/icon.json` centered for this logo. The images already include their intended optical alignment, so additional translation or scaling in the iOS icon composer should not be added without a visual review. The iOS dark and tinted images are wired through the layer's `image-name-specializations` array with `appearance: "dark"` and `appearance: "tinted"`; do not add separate groups for appearance variants. Keep the layer glass/translucency settings enabled so iOS can render transparent Liquid Glass icons instead of falling back to the static light background.

The iOS tinted icon is derived from the iOS light icon's visible logo regions so each shape keeps the same placement as the reference asset. The left C uses light gray `#DDE3E8`, while the right C and graduation cap use white `#FFFFFF`.
