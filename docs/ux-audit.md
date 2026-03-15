# UX Audit — Spice & Slice Bazaar

**Date:** March 15, 2026  
**Auditor:** Automated Dev Agent  
**App Version:** Commit `e7d16c1` (main branch)  
**Viewports Tested:** Mobile (375×812), Tablet (768×1024), Desktop (1440×900)  
**Pages Audited:** Home, Products, Catering, Lunch Box, Contact, Auth, 404  
**Screenshots:** `docs/ux-audit-v2/`

> **Note:** This audit was performed with mock Clerk authentication and placeholder Supabase credentials. Sections that depend on live API data (product listings, collections, flash deals, featured products, festivals, recipes, TikTok embeds, shop combos) render empty or show error states. The audit focuses on layout, UX patterns, accessibility, and design consistency across what's visually rendered.

---

## Executive Summary

The site has **solid responsive foundations** — Tailwind breakpoints work correctly, navigation switches to a hamburger menu on mobile, and content reflows properly. However, there are several UX issues ranging from design polish to accessibility gaps that should be addressed.

**Overall Score:** 6.5/10  
**Critical Issues:** 2  
**Major Issues:** 8  
**Minor Issues:** 12

---

## 🔴 Critical Issues

### C1. Hero Section — Text Contrast Over Background Image
**Pages:** Home (all viewports)  
**Severity:** Critical (WCAG AA violation)

White/cream text sits directly over a food photography background image. Contrast depends entirely on which part of the image is behind the text:
- "Spice&Slice Bazaar" heading is generally readable against darker portions
- Subtitle and description text are lighter weight and can fall below 4.5:1 contrast when positioned over lighter image areas (e.g., bowl rims, rice, light-colored food)
- The left carousel arrow (←) is barely visible

**Recommendation:**
```css
/* Add a semi-transparent overlay */
.hero-overlay {
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.3) 60%,
    transparent 100%
  );
}
```
Or add `text-shadow: 0 2px 4px rgba(0,0,0,0.5)` to all hero text.

---

### C2. Products Page — Error State Shows Raw Error Message
**Pages:** Products (all viewports)  
**Severity:** Critical (User-facing)

When the API fails, the products page shows "Failed to load products" in red text with a "Try Again" button. While this is better than a raw stack trace, the error state:
- Takes up minimal screen real estate, leaving a mostly empty page
- Provides no alternative navigation path (no category links, no search suggestions)
- On mobile, the "Filters" FAB button still appears despite no products being loaded

**Recommendation:**
- Show a more helpful error state with illustrations
- Provide fallback navigation (categories, popular items, contact support)
- Hide the Filters FAB when there are no products to filter

---

## 🟠 Major Issues

### M1. Home Page — Excessive Empty Space (Data-Dependent Sections)
**Pages:** Home (all viewports)  
**Severity:** Major

The home page has many sections (ShopCombos, TikTok, Collections, FeaturedProducts, FlashDeals, Festivals, Recipes) that render as empty/invisible when API data is unavailable. In production, if any of these APIs fail or return empty data, large gaps will appear between visible sections.

**Recommendation:**
- Add skeleton loading states for each section
- Completely unmount sections that have no data (don't render empty containers)
- Add `min-height` constraints to prevent layout shift during loading

---

### M2. Brand Name Inconsistency
**Pages:** All pages  
**Severity:** Major (Brand Identity)

The brand name appears in multiple variations across the site:
| Location | Text |
|----------|------|
| Nav logo | "Spice&Slice" (no spaces) |
| Hero heading | "Spice&Slice Bazaar" |
| Footer logo | "Spice&SliceBazaar" (no space before Bazaar) |
| Auth page | "Spice & Slice Bazaar" (with spaces) |
| Testimonials | "Spice&Splice" (typo — Splice instead of Slice!) |
| Copyright | "Spice & Slice Bazaar" |
| Page title | "Spice & Slice Bazaar" |

**Recommendation:**
- Decide on ONE canonical brand name and use it everywhere
- Fix the "Spice&Splice" typo in the testimonials section immediately
- Consider making the logo an SVG/image to prevent text rendering inconsistencies

---

### M3. Mobile Navigation — Too Many Icons in Header
**Pages:** All pages with nav (mobile viewport)  
**Severity:** Major

At 375px, the mobile header contains: Logo + Search icon (conditional) + Cart icon + User icon/avatar + Hamburger menu icon. That's 4-5 interactive elements crowded into a small header bar. Touch targets are close together and may cause accidental taps.

**Recommendation:**
- Move the user icon inside the hamburger menu
- Keep only: Logo | Cart | Hamburger in the main header bar
- This gives more breathing room and reduces cognitive load

---

### M4. Catering Page — Form is Too Minimal
**Pages:** Catering (all viewports)  
**Severity:** Major

The catering page has just one field: "How many guests are you expecting?" with a "Build My Menu" CTA. The page provides no information about:
- What types of food/menus are available
- Price ranges or packages
- Minimum/maximum guest counts
- Lead time requirements
- Delivery area

Users are asked to commit to "building a menu" with almost no information about what to expect.

**Recommendation:**
- Add catering package previews or popular menu options
- Show price ranges (e.g., "$15-25 per person")
- Add input validation with min/max guest counts
- Include FAQs about the catering process

---

### M5. Contact Page — Map Not Loading on Mobile
**Pages:** Contact (mobile viewport)  
**Severity:** Major

At 375px, the Google Maps embed is not visible. The "Send Us a Message" form and the "Need Immediate Assistance?" section take up the full viewport. The map appears only at tablet and desktop sizes.

**Recommendation:**
- Show a simplified map or a "View on Google Maps" link on mobile
- Ensure the map component doesn't consume resources when hidden

---

### M6. Footer — Redundant with Contact Page
**Pages:** All pages  
**Severity:** Major (Content Architecture)

The footer contains: business hours, address, phone, email, and social links — essentially duplicating the entire contact page. This is common but creates maintenance burden (two sources of truth for business hours, address, etc.).

**Recommendation:**
- Keep the footer concise with just Quick Links, social icons, and a one-line address/phone
- Link to the Contact page for full details
- Centralize business hours in a single data source

---

### M7. 404 Page — Minimal and Unhelpful
**Pages:** 404 (all viewports)  
**Severity:** Major

The 404 page shows only "404", "Oops! Page not found", and a "Return to Home" link. It:
- Has no navigation bar (user is stranded)
- Has no search functionality
- Has no suggested pages or popular links
- Doesn't match the site's visual identity (no brand colors, fonts differ)

**Recommendation:**
- Add the standard Navigation component
- Add search functionality or popular page links
- Use brand styling and possibly an illustration
- Add the Footer component

---

### M8. Auth Page — No Navigation or Back Button
**Pages:** Auth (all viewports)  
**Severity:** Major

The auth page is a full-screen standalone page with no navigation bar, no back button, and no way to return to the site without using the browser back button. Users who click "Login" in the nav are effectively stranded on this page.

**Recommendation:**
- Add a back/close button or the full Navigation component
- Consider using a modal dialog for auth instead of a separate page
- Add a "Continue as Guest" option

---

## 🟡 Minor Issues

### m1. Hero Carousel — Only 1 Slide Visible
**Pages:** Home  
**Severity:** Minor

The carousel has navigation dots (Go to slide 1), previous/next buttons, but only one slide appears to be configured. Having carousel UI for a single item creates unnecessary visual complexity.

**Recommendation:** Hide carousel controls when there's only one slide.

---

### m2. Product Search — No Results Feedback
**Pages:** Home (Global Product Search)  
**Severity:** Minor

The "Find Your Perfect Product" search bar on the home page has popular search tags but no indication of what happens after search. Users may type a query and wonder if it's working.

**Recommendation:** Add loading states and "no results" messaging for the search input.

---

### m3. Chat FAB Button — Overlaps Footer Content
**Pages:** All pages (mobile)  
**Severity:** Minor

The orange chat bubble (AI chat) at the bottom-right can overlap with footer content, the "Filters" button on the products page, and other bottom-positioned elements.

**Recommendation:** Add adequate clearance (16-24px) from other interactive elements. Consider hiding the FAB when the footer is in view on mobile.

---

### m4. Social Media Links — Missing Accessible Names
**Pages:** All pages (footer)  
**Severity:** Minor (Accessibility)

The social media links in the footer (Facebook, Instagram, TikTok) have images but the links themselves have no accessible text labels. Screen readers would announce "link" without context.

**Recommendation:** Add `aria-label` to each social link, e.g., `aria-label="Follow us on Facebook"`.

---

### m5. Lunch Box Page — Price Display Inconsistency
**Pages:** Lunch Box (all viewports)  
**Severity:** Minor

The pricing section shows:
- Weekly Plan: $59.99/week ($11.99 per meal)
- Monthly Plan: $199.99/month (16% savings!)

The "per meal" price for the monthly plan is not shown, making it harder to compare value. Also, "16% savings" isn't immediately verifiable without doing mental math.

**Recommendation:** Show the per-meal price for both plans. Consider a visual comparison table.

---

### m6. Contact Form — No Client-Side Validation Indicators
**Pages:** Contact  
**Severity:** Minor

Required fields (Full Name, Email Address, Message) are marked with asterisks (*) but there's no visible validation feedback until form submission. Inline validation would improve the experience.

**Recommendation:** Add inline validation with error messages as users blur each field.

---

### m7. Desktop Nav — "Products" Not in Main Navigation
**Pages:** All pages (desktop)  
**Severity:** Minor

The main navigation shows: Home | Lunch Box | Catering — but no direct link to "Products". The Products page is one of the main commerce pages but is only accessible via the footer, the "Shop Now" hero button, or the search.

**Recommendation:** Add "Products" (or "Shop") to the main navigation items.

---

### m8. Home Page — "Leave a Review" Button Missing
**Pages:** Home  
**Severity:** Minor

There's a `LeaveReviewButton` component rendered in the home page code, but it doesn't appear in the screenshot (likely hidden when no data is available). The testimonials section shows customer reviews but offers no visible way for users to leave their own.

**Recommendation:** Always show the "Leave a Review" CTA, even when reviews fail to load.

---

### m9. Testimonials — Brand Typo "Spice&Splice"
**Pages:** Home  
**Severity:** Minor (but embarrassing)

The testimonials section header reads "This is what customers feel about **Spice&Splice**" — misspelling "Slice" as "Splice".

**Recommendation:** Fix immediately. Search codebase for other instances of "Splice" that should be "Slice".

---

### m10. Cart Button — No Badge Count
**Pages:** All pages (desktop nav)  
**Severity:** Minor

While the mobile cart button appears to support a count badge, the desktop cart icon doesn't show a prominent item count indicator. Users can't see at a glance how many items are in their cart.

**Recommendation:** Add a visible badge/count indicator to the desktop cart button.

---

### m11. Lunch Box — "Sample Weekly Menu" Empty State
**Pages:** Lunch Box  
**Severity:** Minor

The "Sample Weekly Menu" section shows "No menu items available yet. Check back soon!" This is a reasonable empty state but could be more engaging.

**Recommendation:** Show a sample/placeholder menu or indicate when the next menu will be published.

---

### m12. Navigation — Active State Not Strong Enough
**Pages:** All pages (tablet/desktop)  
**Severity:** Minor

The active navigation item uses a subtle text color change (appears slightly darker or colored). The distinction between active and inactive nav items is not immediately obvious.

**Recommendation:** Use a stronger visual indicator — underline, bold weight, or a bottom border in the brand color.

---

## Accessibility Summary

### ✅ Good Practices Found
- Semantic HTML: Proper use of `<header>`, `<main>`, `<nav>`, `<footer>`, `<h1>`-`<h3>`
- Skip navigation: Hamburger menu has `aria-controls` and `aria-expanded`
- Link accessibility: Phone and email use proper `tel:` and `mailto:` links
- Image alts: Most images have alt text
- Button labels: Most buttons have text or `aria-label`

### ❌ Issues Found
- **Social links missing aria-labels** (m4)
- **Hero text contrast** (C1)
- **No skip-to-content link** for keyboard users
- **Focus management**: After closing mobile menu, focus doesn't return to the hamburger button
- **Color alone used for errors**: "Failed to load products" uses red text as the only indicator

---

## Page-by-Page Screenshots

| Page | Mobile (375px) | Tablet (768px) | Desktop (1440px) |
|------|---------------|----------------|-------------------|
| Home | `home-mobile-375.jpg` | `home-tablet-768.jpg` | `home-desktop-1440.jpg` |
| Products | `products-mobile-375.png` | `products-tablet-768.png` | `products-desktop-1440.png` |
| Catering | `catering-mobile-375.jpg` | `catering-tablet-768.jpg` | `catering-desktop-1440.png` |
| Lunch Box | `lunchbox-mobile-375.jpg` | `lunchbox-tablet-768.jpg` | `lunchbox-desktop-1440.jpg` |
| Contact | `contact-mobile-375.jpg` | `contact-tablet-768.jpg` | `contact-desktop-1440.jpg` |
| Auth | `auth-mobile-375.png` | — | `auth-desktop-1440.png` |
| 404 | `404-mobile-375.png` | — | `404-desktop-1440.png` |

---

## Recommended Priority Order

1. **Fix "Spice&Splice" typo** (m9) — Quick win, embarrassing bug
2. **Hero text contrast overlay** (C1) — WCAG compliance
3. **Add "Products" to main nav** (m7) — Major discoverability issue
4. **Improve 404 page** (M7) — Add nav, search, brand styling
5. **Improve auth page** (M8) — Add back navigation
6. **Standardize brand name** (M2) — Consistency across all pages
7. **Products error state** (C2) — Better empty/error UX
8. **Reduce mobile nav clutter** (M3) — Move user icon to hamburger
9. **Social link aria-labels** (m4) — Quick accessibility fix
10. **Home sections empty state handling** (M1) — Prevent blank gaps
