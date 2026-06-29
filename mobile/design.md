# Outdoor Hounds Mobile App - Design Document

## Overview

The Outdoor Hounds Club mobile app enables users to discover and connect with dogs and members in the community through an intuitive card-based swiping interface. The app is optimized for portrait orientation (9:16) and one-handed usage on iOS and Android.

---

## Screen List

1. **Home / Discover Screen** - Main swiping interface for browsing profiles
2. **Profile Detail Screen** - Expanded view of a selected profile
3. **Enquiry / Interest Screen** - Submit interest or booking request for a profile
4. **My Interactions Screen** - View saved profiles and enquiries
5. **Settings Screen** - User preferences and app configuration

---

## Primary Content and Functionality

### 1. Home / Discover Screen
**Purpose:** Browse dog and member profiles through swipeable cards.

**Content:**
- Card-based layout showing one profile at a time
- Profile image (large, centered)
- Profile name and key info (age, breed, location)
- Quick action buttons (swipe left to pass, swipe right to like, tap for details)
- Indicator showing position in deck (e.g., "5 of 42")

**Functionality:**
- Swipe right: Save/like profile
- Swipe left: Pass on profile
- Tap card: View full profile details
- Tap info icon: Quick preview of profile details
- Pull-to-refresh: Reload profile deck

### 2. Profile Detail Screen
**Purpose:** Display comprehensive information about a selected profile.

**Content:**
- Full-screen image carousel (swipe through multiple photos)
- Profile name, type (dog/member), and key attributes
- Detailed description
- Location and distance (if applicable)
- Services offered (if member)
- Contact information or action button

**Functionality:**
- Swipe through image gallery
- Tap "Interested" or "Book Service" button
- Share profile
- Return to discover screen

### 3. Enquiry / Interest Screen
**Purpose:** Submit interest or booking request for a profile.

**Content:**
- Profile preview (small image + name)
- Form fields:
  - Message/notes (text input)
  - Preferred date/time (if applicable)
  - Contact information (pre-filled if logged in)
- Submit button
- Cancel button

**Functionality:**
- Submit enquiry to profile owner
- Clear form
- Show confirmation message

### 4. My Interactions Screen
**Purpose:** View saved profiles and submitted enquiries.

**Content:**
- Two tabs: "Liked Profiles" and "My Enquiries"
- List of saved profiles with images and names
- List of enquiries with status (pending, approved, rejected)
- Ability to remove saved profiles or view enquiry details

**Functionality:**
- Tap profile to view details
- Tap enquiry to view status/response
- Delete saved profiles
- Resend enquiries

### 5. Settings Screen
**Purpose:** User preferences and app configuration.

**Content:**
- Profile settings (if user has account)
- Notification preferences
- Filter preferences (distance, type, etc.)
- About and help
- Logout (if applicable)

**Functionality:**
- Toggle notifications
- Adjust discovery filters
- View app version and support links

---

## Key User Flows

### Flow 1: Discover and Like a Profile
1. User opens app → Home screen displays first profile card
2. User swipes right or taps "Like" button
3. Profile is saved to "My Interactions"
4. Next profile card appears

### Flow 2: View Profile Details and Submit Enquiry
1. User taps on profile card → Profile Detail screen
2. User swipes through image gallery
3. User taps "Interested" or "Book Service" button → Enquiry screen
4. User fills in message and contact info
5. User taps "Submit" → Confirmation message
6. Enquiry appears in "My Enquiries" tab

### Flow 3: Manage Saved Profiles
1. User taps "My Interactions" tab
2. User views "Liked Profiles" tab
3. User can tap to view full profile or swipe to delete

---

## Color Choices

**Brand Colors for Outdoor Hounds Club:**
- **Primary (Accent):** `#0a7ea4` - Teal/blue (trust, outdoor, nature)
- **Background:** `#ffffff` (light mode) / `#151718` (dark mode)
- **Surface:** `#f5f5f5` (light mode) / `#1e2022` (dark mode)
- **Text (Foreground):** `#11181C` (light mode) / `#ECEDEE` (dark mode)
- **Muted Text:** `#687076` (light mode) / `#9BA1A6` (dark mode)
- **Border:** `#E5E7EB` (light mode) / `#334155` (dark mode)
- **Success:** `#22C55E` - Green (for confirmations)
- **Error:** `#EF4444` - Red (for rejections or warnings)

**Design Rationale:**
- Teal primary color conveys outdoor, adventure, and community
- High contrast text ensures readability in all lighting conditions
- Neutral backgrounds keep focus on profile images
- Color-coded actions (green for success, red for errors) provide clear feedback

---

## Layout Specifications

### Card Dimensions
- **Width:** Full screen width minus 16px padding (margin-left: 8px, margin-right: 8px)
- **Height:** ~60% of screen height for profile card
- **Border Radius:** 16px (rounded corners)
- **Shadow:** Subtle elevation shadow for depth

### Typography
- **Heading (Profile Name):** 24px, bold, foreground color
- **Subheading (Breed/Type):** 16px, medium, muted color
- **Body Text:** 14px, regular, foreground color
- **Small Text (Distance, Location):** 12px, regular, muted color

### Spacing
- **Horizontal Padding:** 16px (standard screen padding)
- **Vertical Spacing:** 12px between elements
- **Card Margin:** 8px top/bottom for swipe clearance

---

## Interaction Patterns

### Swipe Gestures
- **Swipe Right:** Like/save profile (visual feedback: card slides right + green checkmark)
- **Swipe Left:** Pass on profile (visual feedback: card slides left + X icon)
- **Swipe Up (on detail):** Close detail view, return to discover
- **Swipe Down (on gallery):** Exit image carousel

### Button Feedback
- **Primary Button Press:** Scale to 0.97 + haptic feedback (light impact)
- **Secondary Button Press:** Opacity 0.8
- **Icon Button Press:** Opacity 0.6

### Loading States
- Skeleton loaders for profile cards while fetching
- Spinner for form submissions
- Toast notifications for success/error messages

---

## Accessibility Considerations

- All interactive elements have minimum 44x44pt touch targets
- Color is not the only indicator (use icons + text)
- High contrast text (WCAG AA compliant)
- VoiceOver/TalkBack support for screen readers
- Clear button labels and form instructions

---

## Notes

- The app prioritizes simplicity and speed — users should be able to browse profiles quickly
- Profile images are the hero element; text is secondary
- All actions are reversible or have confirmation steps to prevent accidental submissions
- The app works offline for browsing saved profiles; sync happens when connection is available
