/** @type {import('tailwindcss').Config} */

// Tailwind v4 Configuration
// Most configuration is now done via @theme directive in app.css
// This file is optional in v4, but can be used for content paths and plugins

export default {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	// Colors and fonts are now defined in src/app.css using @theme
	// See: https://tailwindcss.com/docs/v4-beta#configuring-with-css
}