// Single source of truth for brand colours.
// Tailwind reads this in tailwind.config.js, so use classes like bg-primary-500,
// text-ink-600, border-danger. In JS (inline styles, SVG) import { colors } directly.
export const colors = {
  primary: {
    50: "#FFF7ED",
    100: "#FFEDD5",
    200: "#FED7AA",
    300: "#FDBA74",
    400: "#FB923C",
    500: "#F97316", // main brand orange
    600: "#EA580C",
    700: "#C2410C",
    800: "#9A3412",
    900: "#7C2D12",
  },
  ink: {
    50: "#FAFAF9",
    100: "#F5F5F4",
    200: "#E7E5E4",
    300: "#D6D3D1",
    400: "#A8A29E",
    500: "#78716C",
    600: "#57534E",
    700: "#44403C",
    900: "#1C1917",
  },
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
};

export default colors;
