/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,ts,tsx,js,jsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        soya: {
          // Stone-Ground Warmth — see DESIGN.soya.md
          bg: "#FBFAF5", // Soy Milk White (page canvas)
          ink: "#2B2419", // Soy Sauce Black (primary text)
          accent: "#E0A52C", // Soybean Gold (CTA / hover / focus)
          accentDeep: "#A6781C", // Roasted Soy (text on gold tint)
          skin: "#FBEFCF", // Soy Milk Skin (badge bg)
          edamame: "#7BA23F", // Edamame Green (secondary accent)
          dim: "#5C4A1A", // dimmed brown for muted copy
          mute: "#6B6051", // Warm 600 — body / descriptions
          surface: "#F4F0E6", // Soybean Pulp (raised surface)
          panel: "#F8F5EC", // Warm 50 — near-canvas tint
          tofu: "#FFFFFF", // tofu-white for cards on canvas
          border: "rgba(43,36,25,0.08)",
          borderStrong: "rgba(43,36,25,0.14)",
        },
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "Noto Sans SC",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        control: "14px", // buttons, inputs
        card: "20px", // cards
        panel: "28px", // featured panels
      },
      boxShadow: {
        soya: "0 2px 6px rgba(75,55,30,0.06)",
        soyaLift: "0 8px 24px rgba(75,55,30,0.08)",
      },
    },
  },
  plugins: [],
};
