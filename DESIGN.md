---
version: alpha
name: thermopb
description: A workspace where a founder finds the shortest trusted route to the person they need to meet, and should feel as plain and certain as a good transit sign.
colors:
  ground: "#f0e9f8"   # lavender mist: page ground, sidebar
  chatGround: "#e9ddf8" # quiet conversation canvas
  sidebar: "#f8f4fc"
  signalHover: "#c5a1e8"
  surface: "#ffffff"  # panels, inputs
  ink: "#352c48"      # deep plum: text only, never a fill
  muted: "#6b5c7c"    # secondary text
  signal: "#d4b5f1"   # light lavender: route fill, current stop, primary actions
  route: "#8054aa"    # muted purple: route lines, focus rings
  plate: "#e5d9ef"    # stop-code tiles
  tag: "#f0e5fa"      # TM tag panel
  peach: "#f5cdb9"    # creative outreach mode only
  stop: "#a3443a"     # blocked or unsourced claims only
  logoCopper: "#bc704b" # PNG brand mark only, warm contrast to lavender
typography:
  display:
    fontFamily: Notion system stack (ui-sans-serif, -apple-system, Segoe UI)
    fontSize: 44px
    fontWeight: 700
    letterSpacing: -0.015em
  body:
    fontFamily: Notion system stack
    fontSize: 14px
    lineHeight: 1.5
  data:
    fontFamily: SFMono-Regular, Menlo, Consolas
    fontSize: 13px
rounded:
  tile: 3px
  control: 4px
  surface: 6px
  conversation: 22px
  composer: 20px
spacing:
  sm: 8px
  md: 16px
  lg: 28px
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: 9px 13px
  stop-code:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
---

## Overview

The navigation is now a floating dock centered at the bottom, replacing the far-left sidebar at the user's request. Retain the existing navigation actions and contextual chat cards; reserve space below the composer so the dock never covers it. The approved transparent PNG logo uses deep plum and warm copper to stand apart from the lavender canvas.

The primary entry point is now a conversation. Chat uses the reference's spacious message column, rounded lavender user messages, white answer cards, and a small contextual rail. Keep the existing system typography, soft palette, and navigation controls. Chat and Dashboard remain one click apart; answers link into the network brain with their target selected. Rounded conversation surfaces and the Chat/Dashboard segmented control are deliberate exceptions to the workspace's square plates. The reference's desktop wallpaper, personal content, and blur are not part of this product.

thermopb (RTM, Route To Meeting) is used by founders before and during events to see who can introduce them to a target, hop by hop. The structure comes from wayfinding signage: plates with short codes, one colour that marks where you are and which way to go. The palette is soft by request: no black fills and no yellow. The interface should read fast and stay calm.

Three modes, switched from a large three-plate switch at the top of every page:
- **Simple** (default): Network brain and TM tag.
- **Advanced**: the full networking workspace.
- **Do creative outreach**: creative ideas and the draft studio.

Dials: ENERGY 1, RHYTHM 2, MOTION 1.

## Colors

- **Ground #f0e9f8:** a light lavender workspace background.
- **Chat ground #e9ddf8:** a stronger lavender canvas, as requested, with white message cards.
- **Sidebar #f8f4fc:** a quiet near-white lavender to frame the conversation.
- **Surface #ffffff:** cards, assistant messages, and composer.
- **Ink #352c48 / Muted #6b5c7c:** deep plum text and readable secondary text.
- **Signal #d4b5f1 / Hover #c5a1e8:** lavender primary actions and selected places.
- **Route #8054aa:** purple path lines and focus rings.
- **Plate #e5d9ef / Tag #f0e5fa:** supporting tiles and user-message fills.
- **Peach #f5cdb9:** creative mode only. **Stop #a3443a:** blocked or unsourced claims only.

The lavender palette replaces the earlier soft blue palette. Keep fills flat and pair the stronger background with white working surfaces.

## Typography

Notion's interface font, by the user's choice: the platform system face (San Francisco on Mac, Segoe UI on Windows) for everything, with Notion's mono stack only for IDs, credits, counts and scores. Headlines are 700 weight with slight negative tracking. Body text is 14px and nothing goes below 12px. Labels are sentence case. No tracked all-caps eyebrows.

## Layout

A floating, bottom-center navigation dock and one working column, max 1320px. The chat context cards remain beside the conversation on larger screens. The mode switch sits at the top of the column on every page. Each screen has one focal point: the headline, then the single most important panel (the graph on Glass Brain, the draft on Routes).

## Elevation & Depth

Flat. Surfaces are separated by a 1px line, not shadows. The one exception is the "new route found" popup, which gets a light lavender offset shadow because it is the only thing that interrupts you.

## Shapes

Tiles 3px, controls 4px, surfaces 6px. No pills except avatars, which are circles.

## Components

- **Navigation dock:** white rounded tray at the bottom center, with the PNG logo, Search, Settings, page icons, and Help. Show the active page label when space allows. The page icons scroll horizontally on narrow screens. Reserve space so chat controls stay above it.
- **Hop tile:** hop numbers along a route sit on a light lavender tile, because they are a real sequence.
- **Mode switch:** three large plates with a name and a one-line description; the active plate fills with its mode colour.
- **Buttons:** primary is light lavender with ink text. Secondary is white with a strong grey border. Arrows appear only where they mean direction (A → B in a hop) or leaving the app (Plan trip).
- **Command palette (⌘K):** pages, people and panel toggles, using the same stop-code tiles.

## Do's and Don'ts

- Don't change: the Notion system font and the approved PNG brand mark.
- Do add a token here before a page uses it. Never invent a one-off inside a page.
- Do keep light lavender on the route. If something is sky blue, it should be part of the path, the current place, or the main action.
- Don't use: gradients, glow shadows, backdrop blur, emoji as icons, cards that lift on hover, spring or bounce easing, all-caps mono eyebrow labels, decorative 01/02/03, middle-dot meta strings, em dashes in UI copy, dot-grid backgrounds, a dark-mode default, black fills, yellow, and any "demo", "fictional" or "sample" wording in the interface.
