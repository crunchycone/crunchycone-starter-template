# Theme Customization Guide

This guide explains how to create and customize themes in the CrunchyCone starter template.

## Overview

The application uses:

- **next-themes** for theme management
- **Tailwind CSS** with CSS variables for theming
- **shadcn/ui** components that adapt to themes
- Support for light, dark, and custom themes

## Current Theme Structure

### CSS Variables

The theme system uses CSS variables defined in `app/globals.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... other dark theme variables ... */
  }
}
```

### Color Format

Colors use HSL format: `hue saturation% lightness%`

- Example: `222.2 84% 4.9%` = hsl(222.2, 84%, 4.9%)

## Creating a New Theme

### Method 1: Adding a Preset Theme

#### Step 1: Define Theme Variables

Add your theme to `app/globals.css`:

```css
/* Ocean Blue Theme */
.theme-ocean {
  --background: 210 100% 98%;
  --foreground: 210 100% 10%;
  --card: 210 50% 100%;
  --card-foreground: 210 100% 10%;
  --popover: 210 50% 100%;
  --popover-foreground: 210 100% 10%;
  --primary: 200 100% 50%;
  --primary-foreground: 210 100% 98%;
  --secondary: 190 60% 85%;
  --secondary-foreground: 210 100% 10%;
  --muted: 200 30% 90%;
  --muted-foreground: 210 50% 40%;
  --accent: 190 80% 70%;
  --accent-foreground: 210 100% 10%;
  --destructive: 350 80% 55%;
  --destructive-foreground: 210 100% 98%;
  --border: 210 40% 85%;
  --input: 210 40% 85%;
  --ring: 200 100% 50%;
  --radius: 0.5rem;
}

/* Forest Green Theme */
.theme-forest {
  --background: 120 25% 98%;
  --foreground: 120 25% 10%;
  --card: 120 20% 99%;
  --card-foreground: 120 25% 10%;
  --popover: 120 20% 99%;
  --popover-foreground: 120 25% 10%;
  --primary: 140 60% 40%;
  --primary-foreground: 120 25% 98%;
  --secondary: 100 40% 80%;
  --secondary-foreground: 120 25% 10%;
  --muted: 110 20% 90%;
  --muted-foreground: 120 20% 40%;
  --accent: 130 50% 60%;
  --accent-foreground: 120 25% 10%;
  --destructive: 0 70% 50%;
  --destructive-foreground: 120 25% 98%;
  --border: 120 20% 85%;
  --input: 120 20% 85%;
  --ring: 140 60% 40%;
  --radius: 0.375rem;
}
```

#### Step 2: Update Theme Toggle Component

Modify `components/theme-toggle.tsx`:

```typescript
"use client";

import * as React from "react";
import { Moon, Sun, Palette } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Palette className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Custom Themes</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("ocean")}>
          🌊 Ocean Blue
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("forest")}>
          🌲 Forest Green
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### Step 3: Update Theme Provider

Modify `app/layout.tsx` to include custom themes:

```typescript
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  themes={["light", "dark", "ocean", "forest"]}
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

### Method 2: User-Customizable Themes

#### Step 1: Create Theme Configuration

Create `lib/theme/theme-config.ts`:

```typescript
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface ThemeConfig {
  name: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  radius: string;
  fontFamily?: string;
}

export const defaultThemes: Record<string, ThemeConfig> = {
  default: {
    name: "Default",
    colors: {
      light: {
        background: "0 0% 100%",
        foreground: "222.2 84% 4.9%",
        // ... rest of default light colors
      },
      dark: {
        background: "222.2 84% 4.9%",
        foreground: "210 40% 98%",
        // ... rest of default dark colors
      },
    },
    radius: "0.5rem",
  },
  ocean: {
    name: "Ocean Blue",
    colors: {
      light: {
        background: "210 100% 98%",
        foreground: "210 100% 10%",
        // ... rest of ocean light colors
      },
      dark: {
        background: "210 50% 10%",
        foreground: "210 20% 90%",
        // ... rest of ocean dark colors
      },
    },
    radius: "0.5rem",
  },
};
```

#### Step 2: Create Theme Editor Component

Create `components/theme-editor.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

export function ThemeEditor() {
  const [themeName, setThemeName] = useState("");
  const [colors, setColors] = useState({
    primary: { h: 222, s: 47, l: 11 },
    secondary: { h: 210, s: 40, l: 96 },
    accent: { h: 210, s: 40, l: 96 },
  });

  const updateColor = (colorName: string, component: 'h' | 's' | 'l', value: number) => {
    setColors(prev => ({
      ...prev,
      [colorName]: {
        ...prev[colorName as keyof typeof prev],
        [component]: value,
      },
    }));
  };

  const generateCSS = () => {
    const css = `
.theme-${themeName.toLowerCase().replace(/\s+/g, '-')} {
  --primary: ${colors.primary.h} ${colors.primary.s}% ${colors.primary.l}%;
  --secondary: ${colors.secondary.h} ${colors.secondary.s}% ${colors.secondary.l}%;
  --accent: ${colors.accent.h} ${colors.accent.s}% ${colors.accent.l}%;
  /* Add other color variables as needed */
}`;
    return css;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Editor</CardTitle>
        <CardDescription>Create your custom theme</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="theme-name">Theme Name</Label>
          <Input
            id="theme-name"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            placeholder="My Custom Theme"
          />
        </div>

        <Tabs defaultValue="primary">
          <TabsList>
            <TabsTrigger value="primary">Primary</TabsTrigger>
            <TabsTrigger value="secondary">Secondary</TabsTrigger>
            <TabsTrigger value="accent">Accent</TabsTrigger>
          </TabsList>

          {Object.entries(colors).map(([colorName, colorValue]) => (
            <TabsContent key={colorName} value={colorName} className="space-y-4">
              <div
                className="w-full h-20 rounded-md border"
                style={{
                  backgroundColor: `hsl(${colorValue.h}, ${colorValue.s}%, ${colorValue.l}%)`,
                }}
              />

              <div className="space-y-2">
                <div>
                  <Label>Hue: {colorValue.h}°</Label>
                  <Slider
                    value={[colorValue.h]}
                    onValueChange={([v]) => updateColor(colorName, 'h', v)}
                    max={360}
                    step={1}
                  />
                </div>

                <div>
                  <Label>Saturation: {colorValue.s}%</Label>
                  <Slider
                    value={[colorValue.s]}
                    onValueChange={([v]) => updateColor(colorName, 's', v)}
                    max={100}
                    step={1}
                  />
                </div>

                <div>
                  <Label>Lightness: {colorValue.l}%</Label>
                  <Slider
                    value={[colorValue.l]}
                    onValueChange={([v]) => updateColor(colorName, 'l', v)}
                    max={100}
                    step={1}
                  />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div>
          <Label>Generated CSS</Label>
          <pre className="mt-2 p-4 bg-muted rounded-md overflow-x-auto">
            <code>{generateCSS()}</code>
          </pre>
        </div>

        <Button
          onClick={() => navigator.clipboard.writeText(generateCSS())}
          className="w-full"
        >
          Copy CSS
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Method 3: Dynamic Theme Loading

#### Step 1: Create Theme API

Create `app/api/themes/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSession } from "@/lib/auth/auth";

const prisma = new PrismaClient();

// Get user's custom themes
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ themes: [] });
  }

  const themes = await prisma.customTheme.findMany({
    where: {
      user_id: session.userId,
    },
  });

  return NextResponse.json({ themes });
}

// Save a custom theme
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const theme = await prisma.customTheme.create({
    data: {
      user_id: session.userId,
      name: body.name,
      config: body.config,
    },
  });

  return NextResponse.json({ theme });
}
```

#### Step 2: Add Database Schema

Add to `prisma/schema.prisma`:

```prisma
model CustomTheme {
  id         Int       @id @default(autoincrement())
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt

  user_id    Int
  name       String
  config     Json      // Store theme configuration
  is_public  Boolean   @default(false)

  user       User      @relation(fields: [user_id], references: [id])

  @@index([user_id])
  @@index([is_public])
}

model User {
  // ... existing fields ...
  customThemes CustomTheme[]
}
```

## Advanced Theme Features

### 1. Theme Persistence

Store user's theme preference in database:

```typescript
// In user preferences
model UserPreferences {
  id         Int       @id @default(autoincrement())
  user_id    Int       @unique
  theme      String    @default("system")

  user       User      @relation(fields: [user_id], references: [id])
}
```

### 2. Theme Preview

Create a live preview component:

```typescript
export function ThemePreview({ theme }: { theme: ThemeConfig }) {
  return (
    <div
      className="p-4 rounded-lg border"
      style={{
        '--background': theme.colors.light.background,
        '--foreground': theme.colors.light.foreground,
        // ... other variables
      } as React.CSSProperties}
    >
      <div className="space-y-2">
        <div className="bg-background text-foreground p-2 rounded">
          Background & Foreground
        </div>
        <div className="bg-primary text-primary-foreground p-2 rounded">
          Primary Color
        </div>
        <div className="bg-secondary text-secondary-foreground p-2 rounded">
          Secondary Color
        </div>
      </div>
    </div>
  );
}
```

### 3. Theme Marketplace

Share themes between users:

```typescript
// Public themes page
export async function getPublicThemes() {
  const themes = await prisma.customTheme.findMany({
    where: {
      is_public: true,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return themes;
}
```

## Color Utilities

### HSL to Hex Converter

```typescript
export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
```

### Color Contrast Checker

```typescript
export function getContrastRatio(color1: string, color2: string): number {
  // Implementation of WCAG contrast ratio calculation
  // Returns a number between 1 and 21
}

export function isAccessible(
  background: string,
  foreground: string,
  level: "AA" | "AAA" = "AA"
): boolean {
  const ratio = getContrastRatio(background, foreground);
  return level === "AA" ? ratio >= 4.5 : ratio >= 7;
}
```

## Theme Guidelines

### Color Selection

1. **Contrast**: Ensure WCAG AA compliance (4.5:1 for normal text)
2. **Consistency**: Use consistent saturation levels
3. **Hierarchy**: Primary should stand out, secondary should complement
4. **Dark Mode**: Test both light and dark variants

### Semantic Colors

- **Background/Foreground**: Main content areas
- **Card**: Elevated surfaces
- **Popover**: Floating elements
- **Primary**: Main actions, brand color
- **Secondary**: Supporting actions
- **Muted**: Disabled states, subtle elements
- **Accent**: Highlights, focus states
- **Destructive**: Errors, delete actions

### Testing Themes

1. **Component Testing**: Check all UI components
2. **Contrast Testing**: Use tools like WebAIM Contrast Checker
3. **User Testing**: Get feedback on readability
4. **Device Testing**: Test on different screens

## Deployment Considerations

### 1. CSS Size

Minimize theme CSS:

```typescript
// Only include active themes
export function getActiveThemeCSS(activeThemes: string[]) {
  return activeThemes.map((theme) => getThemeCSS(theme)).join("\n");
}
```

### 2. Performance

Use CSS custom properties for instant switching:

```typescript
// No page reload needed
document.documentElement.className = "theme-ocean";
```

### 3. SSR Compatibility

Prevent hydration mismatches:

```typescript
<html lang="en" suppressHydrationWarning>
  {/* Theme class applied by next-themes */}
</html>
```

## Examples

### Seasonal Themes

```css
/* Winter Theme */
.theme-winter {
  --background: 210 50% 98%;
  --foreground: 210 50% 10%;
  --primary: 195 80% 50%;
  --secondary: 200 60% 85%;
  /* Cool blues and whites */
}

/* Autumn Theme */
.theme-autumn {
  --background: 30 30% 96%;
  --foreground: 30 30% 10%;
  --primary: 20 80% 50%;
  --secondary: 35 60% 70%;
  /* Warm oranges and browns */
}
```

### High Contrast Theme

```css
.theme-high-contrast {
  --background: 0 0% 100%;
  --foreground: 0 0% 0%;
  --primary: 0 0% 0%;
  --primary-foreground: 0 0% 100%;
  --border: 0 0% 0%;
  /* Maximum contrast for accessibility */
}
```

## Troubleshooting

### Common Issues

1. **Theme not applying**: Check ThemeProvider configuration
2. **Flash of wrong theme**: Use `suppressHydrationWarning`
3. **CSS variables not working**: Ensure proper HSL format
4. **Custom themes not showing**: Update themes array in ThemeProvider

### Debug Mode

```typescript
// Log theme changes
const { theme, systemTheme } = useTheme();
console.log("Current theme:", theme);
console.log("System theme:", systemTheme);
```
