# PMWDS Responsive Properties by Category (clamp format)

## 1. Mobile (Small) — 320px to 639px

Sidebar
- Width: clamp(240px, 70vw, 280px) · overlay mode

Margin
- Sidebar user section: x: clamp(8px, 2vw, 12px) · bottom: clamp(12px, 2vw, 16px)
- Nav section spacing: clamp(16px, 2.5vw, 20px)
- Content left: 0 (overlay sidebar)

Padding
- Logo section: x: clamp(12px, 2vw, 16px) · top: clamp(16px, 2.5vw, 20px) · bottom: clamp(8px, 1.5vw, 12px)
- User section: x: clamp(8px, 2vw, 12px) · y: clamp(8px, 1.5vw, 12px)
- Nav items: x: clamp(8px, 1.5vw, 12px) · y: clamp(7px, 1vw, 9px)
- Nav scroll area: x: clamp(8px, 1.5vw, 12px)
- Topbar: 0 clamp(8px, 3vw, 24px)
- Main content: clamp(12px, 2vw, 40px)
- Logout section: x: clamp(8px, 1.5vw, 12px) · bottom: clamp(8px, 1.5vw, 12px) · top: clamp(4px, 1vw, 8px)
- Logout button: x: clamp(8px, 1.5vw, 12px) · y: clamp(8px, 1.5vw, 10px)

Icons
- Nav icons: clamp(16px, 2vw, 18px)
- Toggle chevron: clamp(14px, 2vw, 18px)
- Hamburger menu: clamp(16px, 2.5vw, 20px)
- Topbar actions: clamp(16px, 2.5vw, 20px)
- Logout icon: clamp(16px, 2vw, 18px)
- Notification dot: clamp(6px, 1vw, 8px)

Typography
- Logo: clamp(18px, 2.5vw, 22px) · weight: 900
- Nav labels: clamp(11px, 1.5vw, 13px) · weight: 500
- Section titles: clamp(9px, 1.2vw, 10px) · weight: 600 · tracking: 0.18em
- User name: clamp(11px, 1.5vw, 13px) · weight: 500
- User role: clamp(8px, 1vw, 9px) · tracking: 0.18em
- Logout text: clamp(11px, 1.5vw, 13px)

Border
- Nav items radius: 6px
- User section radius: 16px
- Logout button radius: 12px
- Active nav border: right 3px solid
- Topbar border: bottom 1px
- Toggle/Hamburger radius: 8px
- Action buttons radius: full (9999px)

Gap
- Nav items gap: clamp(1px, 0.3vw, 2px)
- Nav section items gap: clamp(4px, 0.8vw, 6px)
- Topbar elements gap: clamp(8px, 1.5vw, 12px)
- Content gap: clamp(16px, 2.5vw, 48px)

Buttons
- Toggle size: clamp(28px, 4vw, 32px)
- Hamburger size: clamp(28px, 4vw, 32px)
- Action buttons size: clamp(32px, 4.5vw, 38px)
- Logout button size: clamp(28px, 4vw, 32px)

Height
- Topbar: clamp(48px, 6vw, 56px)

Avatar
- Size: sm (32px) · ring: 2px


## 2. Mobile (Large) — 640px to 767px

Sidebar
- Width: clamp(260px, 60vw, 300px) · overlay mode

All other properties: Same as Mobile Small


## 3. Tablet (Portrait) — 768px to 1023px

Sidebar
- Width: clamp(56px, 8vw, 64px) · always compact · no text

Margin
- Content left: clamp(56px, 8vw, 64px)

Padding
- Sidebar scroll area: x: clamp(2px, 0.5vw, 4px)
- User section: clamp(6px, 1vw, 8px) · centered
- Nav items: x: 0 · y: clamp(7px, 1vw, 9px) · centered
- Logout section: x: clamp(4px, 1vw, 8px)
- Logout button: clamp(8px, 1.5vw, 10px) · centered

Icons
- Same as mobile · slightly larger at breakpoint

Typography
- No labels shown · no section titles · icons only

Avatar
- Size: xs (24px)


## 4. Tablet Landscape / Small Laptop — 1024px to 1279px

Sidebar
- Compact: 64px · Expanded: clamp(200px, 25vw, 220px)
- Toggleable · default compact

Margin
- Content left compact: 64px
- Content left expanded: clamp(200px, 25vw, 220px)

Padding
- Expanded nav items: x: clamp(8px, 1.5vw, 12px) · y: clamp(7px, 1vw, 9px)
- Expanded sidebar scroll: x: clamp(8px, 1.5vw, 12px)
- Expanded user section: x: clamp(8px, 2vw, 12px) · y: clamp(8px, 1.5vw, 12px)

Typography
- All text visible when expanded · same clamp ranges as mobile
- Hidden when compact

Icons
- Nav icons: clamp(16px, 2vw, 18px)


## 5. Desktop (Standard) — 1280px to 1535px

Sidebar
- Compact: 64px · Expanded: clamp(220px, 22vw, 240px)
- Default expanded on load

Margin
- Content left expanded: clamp(220px, 22vw, 240px)
- Content max-width: 1800px · centered

Padding
- Topbar: 0 clamp(8px, 3vw, 24px)
- Main content: clamp(12px, 2vw, 40px)

Typography
- Logo: clamp(18px, 2.5vw, 22px)
- Nav labels: clamp(11px, 1.5vw, 13px)
- Section titles: clamp(9px, 1.2vw, 10px)

Icons
- Nav icons: clamp(16px, 2vw, 18px)
- Action icons: clamp(16px, 2.5vw, 20px)

Gap
- Content gap: clamp(16px, 2.5vw, 48px)
- Topbar gap: clamp(8px, 1.5vw, 16px)


## 6. Desktop (Large) — 1536px to 1919px

Sidebar
- Compact: 64px · Expanded: clamp(230px, 18vw, 250px)

Margin
- Content left expanded: clamp(230px, 18vw, 250px)

Padding
- Main content: clamp(24px, 2vw, 36px)

Typography
- Logo: clamp(20px, 2vw, 22px)
- Nav labels: clamp(12px, 1.2vw, 13px)

Icons
- Nav icons: clamp(17px, 1.5vw, 18px)


## 7. Desktop (Extra Large / 4K) — 1920px+

Sidebar
- Compact: 64px · Expanded: clamp(240px, 12vw, 280px)

Margin
- Content left expanded: clamp(240px, 12vw, 280px)
- Content max-width: 1800px · auto margins for centering

Padding
- Main content: clamp(32px, 1.5vw, 40px)
- Topbar: 0 clamp(18px, 1.5vw, 24px)

Typography
- Logo: clamp(20px, 1.2vw, 22px)
- Nav labels: clamp(12px, 0.8vw, 13px)
- Section titles: clamp(10px, 0.6vw, 10px)

Icons
- Nav icons: clamp(17px, 1vw, 18px)
- Action icons: clamp(18px, 1vw, 20px)

Gap
- Content gap: clamp(32px, 2vw, 48px)
- Topbar gap: clamp(12px, 0.8vw, 16px)

Height
- Topbar: clamp(52px, 3vw, 56px)