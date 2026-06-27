# Extension01

Extension01 is a production-ready Tableau Dashboard Extension built with React, TypeScript, Vite, and the Tableau Extensions API. It renders a responsive full-year circular calendar heatmap inspired by Andy Kriebel-style calendar dashboards.

The project now includes two manifests:

- `manifest.trex` for dashboard use as a dashboard object.
- `manifest-viz.trex` for worksheet use as a Tableau Viz Extension from the Marks card.

## Features

- 12-month full-year calendar heatmap
- Month headers and responsive month grid
- Monday or Sunday week start
- Circular day cells with configurable size, spacing, border width, and radius
- Dynamic heatmap values from Tableau worksheet summary data
- Day click filtering back into Tableau
- Native hover tooltips
- Developer configuration dialog
- Tableau Extension Settings API persistence
- Custom CSS injection for advanced styling
- Works in Tableau Desktop, Tableau Server, and Tableau Cloud when hosted over an allowed origin

## Project Structure

```text
Extension01/
  manifest.trex
  package.json
  vite.config.ts
  README.md
  index.html
  tsconfig.json
  src/
    App.tsx
    Calendar.tsx
    DayCell.tsx
    ConfigDialog.tsx
    tableau.ts
    renderer.ts
    settings.ts
    main.tsx
  styles/
    calendar.css
    config.css
  public/
    icon.png
```

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Vite serves the extension at:

```text
http://localhost:5173/
```

The included `manifest.trex` points to that URL for local Tableau Desktop development.

## Build

```bash
npm run build
```

The production build is emitted to:

```text
dist/
```

Host the contents of `dist/` on HTTPS for Tableau Server and Tableau Cloud. Then update `manifest.trex`:

```xml
<source-location>
  <url>https://your-domain.example.com/extension01/</url>
</source-location>
```

## Tableau Setup

### Use on a Worksheet

1. Start the local server with `npm run dev`.
2. Open a worksheet in Tableau Desktop.
3. On the Marks card, open the Mark Type dropdown.
4. Under Viz Extensions, choose Add Extension.
5. Choose Access Local Viz Extensions.
6. Select `manifest-viz.trex`.
7. Drag a day-level date field to the Date encoding.
8. Drag a numeric measure to the Value encoding.
9. Optionally drag dimensions such as Region, Category, Segment, or Customer to Attribute or Detail so they appear in the control panel.

### Use on a Dashboard

1. Open Tableau Desktop.
2. Add an Extension object to a dashboard.
3. Select `manifest.trex`.
4. Allow the requested permissions.
5. Open the extension configuration using Tableau's extension menu or the gear button in the upper-right corner.
6. Choose the worksheet, date field, and numeric value field.
7. Save settings.

## Data Requirements

The selected worksheet summary data should contain:

- One date-like dimension, such as `Order Date`, `Date`, or `Day`.
- One numeric measure, such as `Sales`, `Profit`, `Count`, or `Quantity`.

Rows are grouped by calendar day inside the extension. Multiple marks on the same day are summed.

## Configuration

All settings are stored with the Tableau Extension Settings API:

- Worksheet
- Date field
- Value field
- Monday/Sunday week start
- Cell size
- Cell spacing
- Border width
- Border radius
- Font family
- Month spacing
- Background color
- Header color
- Weekend color
- Today color
- Null color
- Heatmap palette
- Number of months per row
- Custom CSS

## Deployment Notes

For Tableau Desktop development, `http://localhost:5173/` is sufficient.

For Tableau Server or Tableau Cloud:

- Run `npm run build`.
- Host `dist/` on HTTPS.
- Update the `<source-location>` URL in `manifest.trex`.
- Ensure the hosting domain is allowed by your Tableau environment's extension security policy.
- Keep the Tableau Extensions API script in `index.html`; Tableau loads it from the official Tableau-hosted resource.

## Filtering Behavior

Clicking a day calls `worksheet.applyFilterAsync` with the configured date field and the clicked ISO date. Use a worksheet date field whose values can be matched by Tableau as day-level dates.
