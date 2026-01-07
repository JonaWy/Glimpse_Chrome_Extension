# Candyland Design Style Guide

This design style implements the Candyland theme from shadcn/ui with a playful, candy-inspired aesthetic featuring soft pastels and vibrant accents.

## Installation

```bash
npx shadcn@latest add https://tweakcn.com/r/themes/candyland.json
```

## Typography

### Font Families
- **Sans Serif (Primary)**: Poppins, sans-serif
- **Monospace (Code)**: Roboto Mono, monospace  
- **Serif (Optional)**: Georgia, Cambria, "Times New Roman", Times, serif

### Letter Spacing
- Normal: 0em (default)
- Tight: -0.025em
- Tighter: -0.05em
- Wide: +0.025em
- Wider: +0.05em
- Widest: +0.1em

## Design Tokens

### Border Radius
- Standard radius: **0.5rem** (8px) - Use for all cards, buttons, inputs, and containers

### Spacing
- Base spacing unit: **0.25rem** (4px)

## Color Palette

### Light Mode

#### Primary Colors
- **Background**: `oklch(0.9809 0.0025 228.7836)` - Very light, almost white with subtle purple tint
- **Foreground**: `oklch(0.3211 0 0)` - Dark gray/black for text
- **Primary**: `oklch(0.8677 0.0735 7.0855)` - Soft peachy/coral pink
- **Secondary**: `oklch(0.8148 0.0819 225.7537)` - Soft blue/lavender
- **Accent**: `oklch(0.9680 0.2110 109.7692)` - Bright lime green

#### Surface Colors
- **Card**: `oklch(1.0000 0 0)` - Pure white
- **Popover**: `oklch(1.0000 0 0)` - Pure white
- **Muted**: `oklch(0.8828 0.0285 98.1033)` - Light yellow-green

#### Semantic Colors
- **Destructive**: `oklch(0.6368 0.2078 25.3313)` - Orange-red
- **Border**: `oklch(0.8699 0 0)` - Light gray
- **Ring (Focus)**: Same as Primary

### Dark Mode

#### Primary Colors
- **Background**: `oklch(0.2303 0.0125 264.2926)` - Deep purple-blue
- **Foreground**: `oklch(0.9219 0 0)` - Off-white
- **Primary**: `oklch(0.8027 0.1355 349.2347)` - Pink/rose
- **Secondary**: `oklch(0.7395 0.2268 142.8504)` - Vibrant green
- **Accent**: `oklch(0.8148 0.0819 225.7537)` - Soft blue/lavender

#### Surface Colors
- **Card**: `oklch(0.3210 0.0078 223.6661)` - Darker purple-blue
- **Popover**: `oklch(0.3210 0.0078 223.6661)` - Darker purple-blue
- **Muted**: `oklch(0.3867 0 0)` - Dark gray

#### Semantic Colors
- **Destructive**: `oklch(0.6368 0.2078 25.3313)` - Orange-red
- **Border**: `oklch(0.3867 0 0)` - Dark gray
- **Ring (Focus)**: Same as Primary

## Shadows

All shadows use subtle opacity for a soft, playful appearance:

- **2xs/xs**: `0 1px 3px 0px hsl(0 0% 0% / 0.05)` - Minimal shadow
- **sm/default**: `0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)` - Subtle elevation
- **md**: `0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)` - Medium elevation
- **lg**: `0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)` - Pronounced elevation
- **xl**: `0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)` - Strong elevation
- **2xl**: `0 1px 3px 0px hsl(0 0% 0% / 0.25)` - Maximum elevation

## Chart Colors

### Light Mode
1. **Chart 1**: Peachy pink (primary)
2. **Chart 2**: Soft blue (secondary)
3. **Chart 3**: Lime green (accent)
4. **Chart 4**: Coral pink
5. **Chart 5**: Teal green

### Dark Mode
1. **Chart 1**: Pink/rose (primary)
2. **Chart 2**: Vibrant green (secondary)
3. **Chart 3**: Soft lavender (accent)
4. **Chart 4**: Bright lime
5. **Chart 5**: Yellow-green

## Component Guidelines

### Buttons
- Use **primary** color for main actions (peachy pink in light, rose in dark)
- Use **secondary** color for secondary actions (soft blue in light, green in dark)
- Use **accent** color for special highlights (lime green in light, lavender in dark)
- Border radius: 0.5rem
- Apply subtle shadows for depth

### Cards
- Background: white in light mode, darker purple-blue in dark mode
- Border radius: 0.5rem
- Use subtle shadows (sm or md)
- Maintain good contrast with foreground text

### Inputs & Forms
- Border color: light gray in light mode, dark gray in dark mode
- Focus ring: matches primary color
- Border radius: 0.5rem
- Background: card color

### Navigation & Sidebar
- Background matches main background
- Active/selected items use primary color
- Hover states use accent color
- Borders match the theme border color

## Design Principles

1. **Playful & Friendly**: The candy-inspired palette creates a fun, approachable aesthetic
2. **High Contrast**: Ensure text remains readable with proper foreground/background contrast
3. **Consistent Rounding**: Use 0.5rem border radius throughout for visual cohesion
4. **Subtle Shadows**: Keep shadows light and soft to maintain the playful feel
5. **Color Hierarchy**: Primary (peachy/pink) > Secondary (blue/lavender) > Accent (green)
6. **Clean Typography**: Poppins provides a modern, friendly sans-serif aesthetic

## Usage Examples

### Button Component
```tsx
// Primary button (peachy pink)
<button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg">
  Click me
</button>

// Secondary button (soft blue)
<button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg">
  Cancel
</button>

// Accent button (lime green)
<button className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg">
  Special
</button>
```

### Card Component
```tsx
<div className="bg-card text-card-foreground rounded-lg shadow-md p-6">
  <h2 className="font-sans text-xl font-semibold mb-4">Card Title</h2>
  <p className="text-muted-foreground">Card content goes here</p>
</div>
```

### Form Input
```tsx
<input 
  className="bg-background border border-input rounded-lg px-3 py-2 focus:ring-2 focus:ring-ring"
  placeholder="Enter text..."
/>
```

## Accessibility Notes

- Maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- The theme's foreground/background combinations meet accessibility standards
- Use semantic colors appropriately (destructive for errors/warnings)
- Ensure focus states are clearly visible with the ring color

## When to Use This Theme

Perfect for:
- Consumer-facing applications with a playful brand
- Creative tools and design applications
- Content platforms targeting younger audiences
- Projects that want to stand out with vibrant, friendly aesthetics
- Dashboards that need to feel approachable rather than corporate