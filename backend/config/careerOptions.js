// backend/config/careerOptions.js
// Single source of truth. The schema, the controller validation and the React form (via GET /career-options) all read this.

export const DISABILITY_OPTIONS = [
  { value: "widower", label: "Widower" },
  { value: "widow", label: "Widow" },
  { value: "single_parent", label: "Single parent" },
  { value: "orphan", label: "Orphan" },
  { value: "person_with_disability", label: "Person with a disability" },
  { value: "less_privileged", label: "Less privileged" },
];

export const JOB_MODES = [
  { value: "professional", label: "Professional worker" },
  { value: "artisan", label: "Artisan / skilled trade" },
];

export const JOB_DECISIONS = [
  { value: "jobseeker", label: "Jobseeker" },
  { value: "jobchanger", label: "Job changer" },
];

export const ARTISAN_TRADES = [
  "Air conditioning and refrigeration technician", "Aluminium fabricator", "Auto electrician", "Baker", "Barber",
  "Bricklayer / mason", "Caterer", "CCTV and security installer", "Carpenter", "Cobbler / shoemaker",
  "Computer technician", "Dry cleaner / laundry", "Electrician", "Fashion designer / tailor", "Furniture maker",
  "Gardener / landscaper", "Generator technician", "Glass fitter", "Hair stylist", "Interior decorator",
  "Leather worker", "Makeup artist", "Mechanic", "Panel beater", "Painter", "Phone repairer",
  "Photographer / videographer", "Plumber", "POP / ceiling installer", "Roofer", "Solar installer",
  "Tiler", "Upholsterer", "Vulcanizer", "Welder",
];

export const PRIVATE_STAFF_TYPES = [
  { value: "in_house_cook", label: "In-house cook" },
  { value: "private_driver", label: "Private driver" },
  { value: "professional_security", label: "Professional security" },
  { value: "nanny", label: "Nanny / childminder" },
  { value: "housekeeper", label: "Housekeeper / cleaner" },
  { value: "steward", label: "Steward / house help" },
  { value: "gardener", label: "Gardener" },
  { value: "personal_assistant", label: "Personal assistant" },
  { value: "elderly_caregiver", label: "Caregiver for the elderly" },
  { value: "laundry_attendant", label: "Laundry attendant" },
  { value: "other", label: "Other private staff" },
];

export const values = (list) => list.map((o) => (typeof o === "string" ? o : o.value));