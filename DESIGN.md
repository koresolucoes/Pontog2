---
name: Electric Nocturne
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e5bcc2'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#ac878d'
  outline-variant: '#5c3f44'
  surface-tint: '#ffb2bf'
  primary: '#ffb2bf'
  on-primary: '#660027'
  primary-container: '#ff4d7f'
  on-primary-container: '#5a0021'
  inverse-primary: '#bc004e'
  secondary: '#d7baff'
  on-secondary: '#440088'
  secondary-container: '#7f05f5'
  on-secondary-container: '#e5d0ff'
  tertiary: '#61de8a'
  on-tertiary: '#00391a'
  tertiary-container: '#18a659'
  on-tertiary-container: '#003115'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffd9de'
  primary-fixed-dim: '#ffb2bf'
  on-primary-fixed: '#3f0015'
  on-primary-fixed-variant: '#90003a'
  secondary-fixed: '#eddcff'
  secondary-fixed-dim: '#d7baff'
  on-secondary-fixed: '#280056'
  on-secondary-fixed-variant: '#6100be'
  tertiary-fixed: '#7efba4'
  tertiary-fixed-dim: '#61de8a'
  on-tertiary-fixed: '#00210c'
  on-tertiary-fixed-variant: '#005228'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 48px
    fontWeight: '900'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 36px
    fontWeight: '900'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: '0'
  body-base:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-bold:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: '0'
  label-caps:
    fontFamily: Bricolage Grotesque
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
  timer-mono:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  huge: 64px
  gutter: 12px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

The design system is an ultra-modern, premium framework designed for an immersive LGBTQ+ dating and lifestyle experience. It evokes an atmosphere that is simultaneously intimate, high-energy, and prestigious, mimicking the vibe of an exclusive nocturnal event.

The visual style is a sophisticated blend of **Glassmorphism** and **Deep Minimalism**. It utilizes a "dark-mode first" philosophy where the interface is treated as a physical space. Elements are not just flat pixels but layers of frosted glass and light-emitting surfaces floating over an infinite OLED void. The emotional response should be one of excitement, security, and digital craftsmanship.

- **Primary Motif:** High-fidelity glass layers with precise hairline borders.
- **Lighting:** Atmospheric background blurs (blobs) that provide depth and "backlight" the translucent UI.
- **Motion:** Fluid, scale-based transitions that make the interface feel tactile and responsive.

## Colors

The palette is anchored in a "True Black" (`#050505`) to maximize contrast on OLED displays and save battery. High-energy accents are used sparingly but vibrantly to guide the user's attention.

- **Primary (Nocturnal Pulse Pink):** Used for core actions, active states, and the "Modo Agora" urgency features.
- **Secondary (Pulse Purple):** Used for secondary features, filters, and high-value status indicators.
- **Tertiary (Active Green):** Reserved strictly for "Online" status, verification badges, and "Available Now" markers.
- **Neutrals:** A range of deep slates (`#0A0A0C` to `#121214`) used to create structural hierarchy without breaking the dark immersion.
- **Glass Effects:** Use `rgba(255, 255, 255, 0.08)` for borders to create a "etched glass" look.

## Typography

The typographic system pairs the expressive, character-filled **Bricolage Grotesque** for high-impact display moments with the clean, geometric **DM Sans** for functional reading.

- **Headlines:** Use tight letter-spacing and low line-height to create a "locked-in," impactful look. 
- **Body:** Prioritize legibility with a generous `1.5` line-height.
- **Uppercase Labels:** Always use `label-caps` for metadata, category tags, and section headers to create a professional, architectural feel.
- **Specialty:** For countdowns and timers, use `Space Grotesk` or a similar geometric sans to prevent character-width shifts during live updates.

## Layout & Spacing

The system follows a fluid layout model that prioritizes scanning speed and thumb reach on mobile.

- **Grid:** On mobile, use a 2-column grid for profile discovery to maximize visibility of high-quality imagery. On desktop, scale to a 12-column grid with content maxing out at `1280px`.
- **Rhythm:** Use a 4px base unit. 
- **Padding:** Use generous `xl` (24px) internal padding for cards and modals to maintain the premium, "breathable" feel of the glassmorphic containers.
- **Safe Areas:** Ensure all primary CTAs are within the bottom 30% of the mobile screen for ergonomic reach.

## Elevation & Depth

Hierarchy is established through **optical transparency** and **chromatic glows** rather than standard grey shadows.

- **Base Layer:** OLED Black background.
- **Level 1 (Surface):** Dark Midnight (`#0A0A0C`) with a 1px `border-white/5`.
- **Level 2 (Glass Overlay):** Semi-transparent background with `backdrop-blur-xl`. 
- **Active Elevation:** Elements in a high-priority state (like an active "Modo Agora" session) should use a `shadow-primary-500/30` glow effect to appear as if they are emitting light.
- **Visual Depth:** Place large, low-opacity colored blurs (`blur-3xl`) behind important content sections to "lift" them off the black canvas.

## Shapes

The shape language is defined by **generous roundedness**. Sharp corners are avoided to keep the interface feeling approachable and soft, contrasting with the high-energy neon colors.

- **Default (rounded-md):** 0.5rem (8px) for small inputs and inner elements.
- **Large (rounded-lg):** 1rem (16px) for standard profile cards and navigation panels.
- **Extra Large (rounded-xl):** 1.5rem (24px) for modals, main containers, and primary buttons.
- **Interactive Elements:** Buttons and certain badges use `rounded-full` (pill) to maximize the "tactile" feel.

## Components

### Buttons
- **Primary:** Signature Gradient background, white text, `rounded-full`. Add a subtle pink glow shadow.
- **Glass/Secondary:** `bg-white/5`, `backdrop-blur-md`, `border-white/10`. Text in `text-secondary`.
- **Hover/Active:** Scale down to `0.96` on active press to simulate physical feedback.

### Cards (The "Profile Glass")
- Aspect ratio of `3:4` or `4:5`.
- **Bottom Overlays:** Use a black linear gradient from 0% to 100% opacity at the bottom to ensure white text remains legible over user photos.
- **Status Markers:** Pinned to top-right. Verification badges use a subtle glow.

### Input Fields
- Immersive dark base (`bg-black/40`), `rounded-xl`, `border-white/10`.
- On focus, the border transitions to Primary Pink with a `ring-2 ring-primary-500/20` halo.

### Modals & Drawers
- Full `backdrop-blur-2xl`.
- Background should be a tinted dark glass (`rgba(10, 10, 12, 0.8)`).
- Use a "grab bar" at the top of bottom drawers for clear affordance.

### Specialty: Modo Agora Timer
- A horizontal glass bar with a pulsating primary pink border.
- Uses `timer-mono` typography for the countdown.
- Features a small animated "Fire" or "Pulse" icon on the leading edge.