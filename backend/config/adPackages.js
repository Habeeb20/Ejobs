export const AD_PLACEMENTS = ["dashboard", "public"];

// Placeholder prices (naira). Change these to your own.
export const AD_PACKAGES = [
  { key: "week", name: "1 week", days: 7, price: 3000 },
  { key: "fortnight", name: "2 weeks", days: 14, price: 5000 },
  { key: "month", name: "1 month", days: 30, price: 10000 },
];

export const getAdPackage = (key) => AD_PACKAGES.find((p) => p.key === key) || null;

export const publicAdPackages = () =>
  AD_PACKAGES.map(({ key, name, days, price }) => ({ key, name, days, price }));