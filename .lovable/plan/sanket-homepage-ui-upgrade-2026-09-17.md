# Sanket Homepage UI Upgrade

## Scope
Improve only the existing homepage. Preserve all routes, authentication, data flows, APIs, and button destinations.

## Changes
1. Rework the first screen into a polished light civic-tech composition with concise Sanket messaging and a realistic multi-issue civic visual.
2. Replace the homepage’s coordinate-grid preview with a working Google Map using the existing Google Maps connector flow, stable sizing, demo markers, severity colors, and click details.
3. Clearly mark every mock map incident as “DEMO / SIMULATED DATA” and represent varied civic categories beyond road, drainage, or waste issues.
4. Keep the four requested feature cards, reducing each to an icon, title, and one sentence.
5. Replace the long lower section with the compact seven-step flow from citizen reporting through citizen verification.
6. Keep Sanket branding, light styling, existing buttons, and responsive behavior.

## Technical Details
- Add a homepage-specific Google Maps component so the existing map used by dashboards remains unchanged.
- Load Maps JavaScript asynchronously with the existing connector browser key and tracking ID; disable built-in POI clicks and use standard markers.
- Use semantic design tokens and existing button components; add only homepage-specific styling where needed.
- Verify the homepage at desktop and mobile sizes, marker interactions, console output, and all existing button links.
