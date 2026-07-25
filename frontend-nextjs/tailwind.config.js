/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "on-secondary-container": "#a7c36a",
        "surface-container-highest": "#2c3733",
        "on-surface-variant": "#a7c36a",
        "secondary": "#b4d177",
        "on-tertiary-fixed-variant": "#2a4d48",
        "on-secondary-fixed": "#141f00",
        "primary-container": "#f6851b",
        "on-surface": "#d8e5df",
        "inverse-primary": "#944b00",
        "surface-container-low": "#121e1a",
        "secondary-fixed": "#d0ee90",
        "surface-variant": "#2c3733",
        "surface": "#0a1612",
        "on-background": "#d8e5df",
        "on-tertiary-container": "#1b3f3a",
        "primary-fixed": "#ffdcc5",
        "tertiary": "#a8cec8",
        "primary-fixed-dim": "#ffb783",
        "tertiary-container": "#85aaa4",
        "tertiary-fixed": "#c4eae4",
        "surface-container-high": "#212c28",
        "primary": "#ffb783",
        "on-primary-container": "#5c2c00",
        "inverse-on-surface": "#27332f",
        "surface-container-lowest": "#06100d",
        "surface-bright": "#303c38",
        "surface-dim": "#0a1612",
        "secondary-fixed-dim": "#b4d177",
        "outline": "#a58c7c",
        "error": "#ffb4ab",
        "error-container": "#93000a",
        "on-primary-fixed": "#301400",
        "on-secondary": "#253500",
        "on-tertiary": "#113632",
        "on-error-container": "#ffdad6",
        "on-error": "#690005",
        "secondary-container": "#3a5001",
        "on-primary": "#4f2500",
        "surface-container": "#17221e",
        "on-secondary-fixed-variant": "#384e00",
        "tertiary-fixed-dim": "#a8cec8",
        "outline-variant": "#564336",
        "inverse-surface": "#d8e5df",
        "background": "#0a1612",
        "surface-tint": "#ffb783",
        "on-tertiary-fixed": "#00201d",
        "on-primary-fixed-variant": "#703700"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "margin-mobile": "20px",
        "margin-desktop": "64px",
        "unit": "8px",
        "container-max": "1440px",
        "gutter": "24px"
      },
      fontFamily: {
        "headline-lg": ["Inter", "sans-serif"],
        "display-xl": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "label-mono": ["Space Mono", "monospace"],
        "headline-lg-mobile": ["Inter", "sans-serif"],
        "display-lg": ["Inter", "sans-serif"]
      },
      fontSize: {
        "headline-lg": ["40px", { lineHeight: "110%", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-xl": ["96px", { lineHeight: "90%", letterSpacing: "-0.04em", fontWeight: "800" }],
        "body-md": ["16px", { lineHeight: "160%", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "160%", fontWeight: "400" }],
        "label-mono": ["12px", { lineHeight: "140%", letterSpacing: "0.1em", fontWeight: "500" }],
        "headline-lg-mobile": ["32px", { lineHeight: "110%", fontWeight: "700" }],
        "display-lg": ["64px", { lineHeight: "100%", letterSpacing: "-0.03em", fontWeight: "800" }]
      }
    }
  }
};
