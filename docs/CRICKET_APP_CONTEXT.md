# Cricket Field Setting App — Master Context

## Overview
This is a mobile app built using Expo React Native and expo-router.

The app allows cricket coaches and captains to:
- Create cricket field setups
- Drag and position players on a field
- Name each player/position
- Save multiple field setups
- Add notes for strategies

The app must work on:
- iPhone
- Android phones
- iPad
- Android tablets

## Core Philosophy
- Keep everything SIMPLE
- Build step-by-step
- Do not over-engineer
- Do not add features unless explicitly asked
- Code must be beginner-friendly and clean

## Current Stage
We are in early development.

Current features:
- Home screen
- Button to create a new field
- Field screen exists (basic placeholder)

## Tech Stack
- Expo (React Native)
- TypeScript
- expo-router for navigation

## Folder Structure (target)
app/
  index.tsx (Home Screen)
  field.tsx (Field Editor Screen)

components/
  FieldCanvas.tsx
  PlayerMarker.tsx

storage/
  fieldStorage.ts

types/
  index.ts

## Navigation Rules
- Use expo-router
- Use router.push('/field') for navigation
- Do not introduce other navigation libraries

## UI Rules
- Mobile-first but must scale to tablet
- Use flexible layouts (flexbox)
- Avoid fixed pixel positions where possible
- Use relative positioning for field elements

## Field System (IMPORTANT)
Player positions must use normalized coordinates:
- x: 0 to 1
- y: 0 to 1

This ensures:
- works on all screen sizes
- works on tablets

DO NOT use fixed pixel coordinates for player positions.

## Coding Rules
- Keep code simple and readable
- Avoid unnecessary abstractions
- Avoid adding libraries unless required
- Do not refactor unrelated code
- Only change what is requested

## What NOT to do
- Do NOT add backend
- Do NOT add authentication
- Do NOT add styling libraries
- Do NOT overcomplicate components
- Do NOT change project structure unless asked

## Future Features (do not build yet)
- Drag and drop player markers
- Save field setups
- Notes per field
- Export/share field
- Cloud sync

## Instructions for AI (Cursor)
When making changes:
1. Only implement what is asked
2. Do not modify unrelated files
3. Keep code beginner-friendly
4. Do not introduce complexity
5. Explain changes clearly if needed

---

## Update 1 — Navigation & Screens

### Current Screens
- Home Screen (app/index.tsx)
- Field Screen (app/field.tsx)

### Navigation
- Navigation uses expo-router
- Home → Field via router.push('/field')

### Rules
- Do NOT create nested navigation yet
- Do NOT add tabs or stacks manually
- Keep navigation flat and simple for now

### UX Rule
- One clear action per screen
- Home = entry point
- Field screen = main working screen

### Future (not yet)
- Saved Fields screen
- Notes screen

---

## Update 2 — Field Editor Plan

### Purpose
The Field screen will become the main interactive screen.

### Components to be built
- Field background (cricket ground image)
- Player markers (draggable)
- Player naming system

### Rules
- Field must scale to all screen sizes
- Use relative positioning (0–1 coordinates)
- Do NOT hardcode positions in pixels

### Interaction Plan
- Tap marker → edit name
- Drag marker → change position

### Visual Rule
- Field should always stay centered
- Maintain aspect ratio

---

## Update 3 — Field Image Handling

### Source
We will use a cricket field image as the background.

### Rules
- Image must be stored locally in the project (assets folder)
- Use require() for loading images
- Maintain aspect ratio
- Do NOT stretch or distort image

### Layout
- Image should scale based on screen width
- Height should adjust automatically

### Future
- Option to switch between different field styles

---

## Update 4 — Tablet & Large Screen Support

### Requirement
App must work well on tablets (iPad + Android tablets)

### Rules
- Avoid fixed widths/heights
- Use flexbox layouts
- Use percentage-based sizing where possible

### Layout Behavior
Phone:
- Vertical layout (field on top, controls below)

Tablet:
- Allow more spacing
- Prepare for side-by-side layout later

### Touch Targets
- Buttons and markers must be large enough for touch

---

## Update 5 — Development Workflow

### Approach
- Build in VERY small steps
- Test after every change
- Do not combine multiple features in one step

### Cursor Usage
- Always include: "Follow CRICKET_APP_CONTEXT.md"
- Use precise, minimal instructions
- Avoid vague prompts

### Rules
- If something works → do NOT refactor
- If adding a feature → do ONLY that feature
- Fix bugs immediately before continuing

### Priority
1. Functionality
2. Stability
3. UI polish (later)

---

## Update 6 — Navigation Confirmed

### Status
- Home → Field navigation is working

### Behavior
- "Create New Field" button opens Field screen
- Field screen is currently a placeholder

### Rule
- Do NOT change navigation unless required
- All new features should build on top of this flow

---

## Update 7 — Interactive Field Canvas

### Decision
- Do NOT use a static cricket field image as the main field editor
- The field editor should be a custom interactive field canvas

### Reason
- Player markers need to move freely
- The field must work responsively on phone and tablet
- A custom field canvas is more scalable than a static image

### Field Design
- Draw a simple oval/round cricket outfield
- Draw inner pitch area
- Keep visual design clean and minimal
- Player markers will sit on top of this field

### Interaction Plan
- Markers must be draggable
- Marker positions must be stored as normalized coordinates (0 to 1)
- Do NOT use fixed pixel coordinates for saved positions

---

## Update 8 — Field Proportions & Pitch Detail

### Decision
The interactive field canvas must use more realistic cricket proportions.

### Real-world reference
- Typical boundary radius is around 70 metres
- Cricket pitch length is 22 yards / 20.12 metres
- Cricket pitch width is 10 feet / 3.05 metres

### Design implication
- The pitch must appear MUCH smaller relative to the full field
- The field should visually feel large and open
- The pitch should sit at the center and act as a precise reference point for field placements

### Pitch detail requirements
Include:
- pitch strip
- batting and bowling creases
- return crease / guideline style markings where visually appropriate
- stumps at both ends

### Rules
- Keep the field responsive on phone and tablet
- Keep proportions visually realistic, not oversized
- Keep the UI clean and not overly decorative

---

## Update 10 — Real Pitch Reference Guidance

### Reference handling
A real cricket pitch diagram may be used as a visual reference only.
Do NOT copy the exact image or recreate it literally.

### Pitch drawing requirements
The custom field canvas should include a simplified but believable cricket pitch based on real layout principles:
- central pitch strip
- stumps at both ends
- bowling crease at both ends
- popping crease at both ends
- return creases at both ends

### Accuracy rules
- Markings must stay attached to the pitch area
- Do NOT place extra lines outside the pitch unless they are truly part of the pitch layout
- If uncertain, prefer fewer accurate markings over more incorrect markings

### Design style
- Clean, minimal, diagram-style
- Not photorealistic
- Not copied from any source image
- Visually balanced for mobile and tablet

---

## Update 11 — Structured Field Layout System

### Problem
Previous implementations placed field and pitch elements without a proper layout structure, causing misalignment and unrealistic visuals.

### Solution
Use a strict container-based layout:

1. Field Container
   - Represents the full ground (circle/oval)
   - Must be centered
   - Must scale responsively

2. Pitch Container (inside field)
   - Positioned at exact center of field
   - Small relative to field
   - All pitch elements must live INSIDE this container

3. Pitch Markings
   - Creases and stumps must be positioned relative to the pitch container
   - Do NOT position markings relative to the screen

### Rules
- Never position pitch markings outside the pitch container
- Always center pitch inside field
- Use relative sizing (percentages), not absolute pixels where possible

### Goal
The layout must feel:
- centered
- proportional
- stable across screen sizes

---

## Update 12 — Switch Field Rendering to SVG

### Decision
The custom field canvas should no longer be built using only plain React Native View boxes for the field diagram.

### Reason
- The field, pitch, circles, arcs, and crease lines need cleaner geometry
- Plain View-based drawing is too imprecise and visually poor
- SVG is better for a cricket field diagram and future interactive overlays

### New rule
- Use react-native-svg for field rendering
- Keep player markers as separate interactive overlay elements later
- The field itself should be a clean SVG diagram

### Rendering structure
1. Screen container
2. Responsive field canvas container
3. SVG cricket ground drawing inside it
4. Player markers layered on top later

### Visual goals
- Large centered field
- Clean boundary ring
- Small realistic central pitch
- Accurate, minimal crease/stump lines
- No fake or decorative markings

---

## Update 14 — Field Visual Refinement

### Pitch markings
- Remove wide lines completely
- Stumps should be dark brown
- Add one white line at each short end of the pitch as the outer end border

### Inner circle
- Add a dotted inner circle for fielding restriction reference
- It should be visually based on the real ratio:
  - inner circle radius about 27 metres
  - boundary radius about 70 metres
- So the inner circle should be noticeably smaller than halfway, using a believable cricket ratio rather than guessing

### Inner circle style
- Do NOT use one solid ring
- Use many small white dash marks / short line segments around the circle
- It should look like a classic cricket field restriction circle

### Design rule
- Keep the field clean, minimal, and useful for planning
- Only include markings that improve tactical field setting

---

## Update 15 — Simplify Pitch Markings for Usability

### Decision
The pitch drawing should be simplified for tactical planning clarity.

### Reason
A full technical pitch diagram adds clutter and does not help coaches place fielders more effectively.

### New pitch rule
Keep only:
- pitch strip
- dark brown stumps at both ends
- one simple white crease line at each end

Remove:
- extra crease-like lines
- wide lines
- unnecessary technical pitch markings

### Inner ring usability rule
The inner ring does not need to follow exact real-world ratio if that harms usability.

Use a slightly enlarged inner ring so users can:
- visualize infield positions more clearly
- place fielders more accurately

### Product principle
Prefer tactical clarity over strict diagram realism when the two conflict.

---

## Update 16 — Zoom & Pan Interaction

### Problem
The field canvas is too small for precise placement of close fielders (e.g. slips, short leg).

### Solution
Add zoom and pan interaction.

### Features
- Pinch to zoom in/out
- Drag to pan around the field when zoomed
- Double tap can reset zoom (optional later)

### Behavior rules
- Default view shows full field
- Users can zoom in to place close fielders precisely
- Field must remain smooth and responsive

### Technical approach
- Wrap the field canvas in a zoomable container
- Use gesture handling (pinch + pan)
- Maintain scale and translation state

### UX goal
- Allow precise placement near pitch (slips, gully, short leg)
- Maintain full-field overview when zoomed out

## Notes Module

The app includes a Notes section as a bottom-tab workflow alongside the Field workflow.

### Notes capabilities
Users should be able to:
- create notes
- edit notes
- save notes locally
- load notes locally
- delete notes
- export/share notes

### Note linking
Notes may optionally be linked to a saved field setup.

Recommended structure:
- notes remain separate saved entities
- field setups remain separate saved entities
- notes link to fields by `linkedFieldSetupId`

### Field screen behavior
When a saved field setup is loaded, any linked note should be shown on the Field screen in a simple side panel or compact note card.

### Scope rule
Keep Notes simple in V1:
- plain text notes
- local storage only
- no backend
- no AI
- no collaboration

Update 17 — Real Data, User Accounts & Persistence
Status Change

The app is no longer purely local. It now uses Supabase for authentication and data storage.

Capabilities
Users can create accounts and log in
Each user has their own:
field setups
notes
teams
Data must be user-isolated
Rules
Every saved record MUST include:
user_id
Users must NEVER see other users’ data
All queries must filter by:
user_id = currentUser.id
Data Integrity Rule
The field editor must always save live field state
Do NOT use default field templates when saving
Do NOT overwrite saved data with fallback/default layouts
Persistence Rule
Saved field must restore:
marker positions
field name
linked note
team (if applicable)
Update 18 — Field Save System (CRITICAL)
Problem Identified

Previous implementations caused:

fields saving incorrectly
layouts resetting to default
stale references like activeFieldConfig
Correct System

Field save/update must:

use current live markers state
NOT use any static config object
NOT rely on removed variables
Rules
Single source of truth = live field state
Use normalized coordinates (0–1)
Update existing field if id exists
Insert new field if not
Loading Rule
When opening a saved field:
always use stored data
NEVER regenerate from default layout
Failure Rule
If data missing → fallback ONLY for that field
NEVER apply default to all fields
Update 19 — Admin Mode & System Access
Admin Concept

Admin is determined by:

matching email to ADMIN_EMAIL
Admin Capabilities
Access Users’ Projects
View:
fields
notes
teams
user info (name, email, DOB)
Rules
Admin features must NOT affect normal users
Admin view is read-only unless explicitly expanded later
Update 20 — Profile System
User Profile Includes
name
email
date of birth
password (via auth)
profile picture (new)
Rules
Profile data must persist (Supabase)
Profile updates must NOT require app restart
Sidebar profile card must reflect real data
Profile Image
Stored in Supabase Storage
Linked via avatar_url
Must update immediately after upload
Update 21 — AI Assistant System (NEW CORE FEATURE)
Status

AI is now part of the product (not future).

Purpose

Assist users with:

field setting decisions
bowling strategy
tactical insights
AI Interaction Model

User flow:

User selects ball position on mini pitch
App converts position → cricket input
App sends structured request to AI
AI returns tactical suggestions
Ball Selection System

Must include:

draggable or tappable ball marker
normalized coordinates (0–1)

Must derive:

line (leg / middle / off / wide)
length (yorker / full / good / short)
AI Input Structure

AI must receive structured data:

line
length
intent (attacking / balanced / defensive)
bowling type
optional:
current field setup
match context
AI Output Requirements

AI must return:

concise tactical advice
suggested field positions
reasoning
variation options
Rules
AI must NOT return static/hardcoded text
Output must change based on input
Avoid generic filler responses
Architecture Rule (IMPORTANT)
AI must NOT be called directly from client with secret key
Use:
backend
OR
Supabase Edge Function

Client → Backend → AI → Client

UX Rules
Show loading state during AI request
Handle errors gracefully
Do not block field editing
Update 22 — UI Evolution
Current Direction
Clean, tactical, minimal UI
Tablet-friendly layout
Sidebar navigation (restored)
Rules
Do NOT chase visual trends over usability
Function > aesthetics
Keep layouts consistent
Update 23 — Product Direction Shift
Important Change

This is no longer just a simple field editor.

It is becoming:

A tactical cricket planning tool

Core Pillars
Field creation
Tactical notes
AI-assisted decision making
Build Priority
Stability (saving/loading)
Field interaction
AI usefulness
UI polish (last)
Update 24 — Development Discipline (CRITICAL)
Rules reinforced
Do NOT break working features when adding new ones
Fix bugs immediately before continuing
Avoid partial implementations
Avoid stale variables and unused logic
Always use current state as source of truth
Testing Rule

After any change:

create field
move players
save
reload
confirm exact positions
Summary

The app has evolved from:

simple local field tool

to:

authenticated
persistent
user-isolated
AI-assisted tactical platform