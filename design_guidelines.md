# Design Guidelines: DHBW Lörrach Learning Companion

## Core Architecture

### Authentication & Data
- **No authentication** - Single-user app with AsyncStorage
- **Profile Settings Required:**
  - 4 preset avatars (laptop, graduation cap, code brackets, lightbulb) - DHBW red (#E2001A) + learning blue (#4A90E2) accents, flat geometric style
  - Editable display name
  - Theme toggle, notification settings, language (DE/EN), difficulty level

### Navigation Structure
**3-Tab Layout:**
1. **Learn** (Topic selection)
2. **Practice** (Center - Primary action, 64x64px floating button)
3. **Progress** (Stats, profile)

**Modals:** Quiz Session, Session Summary, Topic Detail

---

## Design System

### Colors
- **Primary:** #E2001A (DHBW Red) - CTAs, errors
- **Secondary:** #4A90E2 (Learning Blue) - progress, links
- **Success:** #34C759 - correct answers
- **Background:** #F8F9FA - screens, code blocks
- **Text:** #2C3E50 - primary text
- **Accent:** #FFB800 - streaks, achievements
- **Disabled:** #D1D5DB

### Typography
- **Headers:** Inter Bold, 24px (screens), 18px (cards)
- **Body:** Roboto Regular, 16px
- **Code:** Fira Code Mono, 14px
- **Labels:** Inter Medium, 14px
- **Captions:** Roboto Regular, 12px

### Spacing: 4/8/12/16/24/32px (xs/sm/md/lg/xl/xxl)

### Components

**Cards:**
- White bg, 12-16px radius, 16px padding, 16px margin
- Shadow: offset(0,1), opacity 0.05, radius 4

**Buttons:**
- **Primary:** Red bg, white text, 56px height, 12px radius, full-width
- **Secondary:** White bg, blue 2px border, 56px height
- **Press state:** Scale 0.98, opacity 0.8
- **Floating (Practice):** 64x64px circle, red gradient, shadow(0,2,0.10,2), elevated 16px above tab bar

**Progress Bars:** 8px height, rounded, blue fill

**Touch Targets:** Minimum 44x44px

### Accessibility
- WCAG AA contrast (4.5:1 minimum)
- VoiceOver labels on all interactive elements
- Error states use color + icons
- Support dynamic text scaling

---

## Screen Layouts

### 1. Learn (Tab 1)
**Header:** Transparent, DHBW logo (32px) left, "Learn JavaScript" title, filter icon right

**Content:** Scrollable topic categories (safe area: headerHeight+24px top, tabBarHeight+24px bottom)
- **Categories:** Fundamentals, Control Flow, Functions, Objects & Arrays, Async, Advanced
- **Category cards:** Title, progress bar (blue), horizontal scrollable topic chips
  - Completed: Green + checkmark
  - In progress: Blue outline
  - Not started: Grey outline (#F8F9FA border)
  - Recommended: Blue outline chip + star icon, no fill (only show when no due-for-review topics)
- **Chips:** 8px radius rounded rectangles

### 2. Practice (Tab 2)
**Floating Action Button:**
- Tapping starts mixed-topic quiz
- Shows loading → transitions to Quiz Session modal
- Specs: 64x64px, red gradient (#E2001A to #B8001A), white play/pencil icon, elevated shadow

### 3. Progress (Tab 3)
**Header:** "Your Progress" title, settings gear icon right

**Content:** Scrollable (24px top, tabBarHeight+24px bottom)
1. **Profile Card:** Avatar (80x80px circular), display name, edit link (blue)
2. **Streak Card:** Large streak number, flame icon (yellow), 7-day calendar grid (green = practiced)
3. **Stats Grid (2 columns):** Total Questions, Topics Mastered, Current/Best Streak - white cards, 12px radius, subtle shadow
4. **Achievements:** Horizontal scroll, 64x64px circular badges (unlocked: color, locked: greyscale + lock)

### 4. Quiz Session (Modal)
**Header:** Transparent, X close left, "3/10" center, progress bar below (blue/grey)

**Content:** Fixed height (headerHeight+16px top, 24px bottom)
- **Question card:** White, 16px radius, shadow
  - Question text: 18px medium, #2C3E50
  - Code block: #F8F9FA bg, Fira Code 14px, syntax highlighting, 16px padding, 8px radius, horizontal scroll
- **Answer buttons (4):** Vertical stack, 12px spacing, 56px min height
  - Default: White bg, blue 2px border, 12px radius
  - Selected: Blue bg, white text
  - Correct: Green bg
  - Incorrect: Red bg
- **Submit button:** Full-width, red bg (disabled: grey until selected), 56px height, no shadow

### 5. Session Summary (Modal)
**Header:** "Session Complete!" title

**Content:** Scrollable (24px top/bottom + insets)
- **Score card:** Circular progress (green >70%, yellow 50-70%, red <50%), "8/10" centered, feedback message
- **Breakdown list:** Questions with checkmark/X, expandable for correct answer
- **Fixed bottom buttons:**
  - "Practice Again" (primary red)
  - "Back to Topics" (secondary blue outline)
  - 16px spacing between

### 6. Settings (Stack)
**Header:** Back button, "Settings" title

**Content:** Scrollable form (24px top/bottom + insets)
- Profile (avatar, name)
- Preferences (notifications, language)
- About (version, DHBW link, privacy)

---

## Topic Categories

**Fundamentals:** Variables, Data Types, Operators  
**Control Flow:** Conditionals, Loops, Switch  
**Functions:** Declarations, Expressions, Arrow Functions, Callbacks  
**Objects & Arrays:** Methods, Destructuring  
**Async:** Promises, Async/Await, Error Handling  
**Advanced:** Closures, Prototypes, Classes, Modules

---

## Required Assets

**Avatars (4):** 256x256px, transparent, flat style
- Laptop (red + blue screen)
- Graduation cap (red + blue tassel)
- Code brackets (blue)
- Lightbulb (yellow + red base)

**Badges (6):** 128x128px circular
- First Quiz (star), 7-Day Streak (flame), 30-Day Streak (fire), 100 Questions (trophy), JS Novice (bronze), JS Master (gold)

**DHBW Logo:** 32px (header), 120px (splash)

All use DHBW red primary + blue/yellow accents.
