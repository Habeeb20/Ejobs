import { Select } from "./ui";

import { statesAndLgas } from "../data/statesLga";
const stateNames = Object.keys(statesAndLgas);

// "AkwaIbom" -> "Akwa Ibom", "CrossRiver" -> "Cross River"
const prettify = (key) => key.replace(/([a-z])([A-Z])/g, "$1 $2");

export default function StateLgaSelect({
  state,
  lga,
  onState,
  onLga,
  errors = {},
  stateLabel = "State",
  lgaLabel = "Local government (LGA)",
}) {
  const lgas = statesAndLgas[state] || [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Select
        id="state"
        label={stateLabel}
        value={state}
        error={errors.state}
        options={stateNames}
        placeholder="Select state"
        onChange={(e) => {
          onState(e.target.value);
          onLga("");
        }}
      />
      <Select
        id="lga"
        label={lgaLabel}
        value={lga}
        error={errors.localGovernment}
        options={lgas}
        placeholder={state ? "Select LGA" : "Select a state first"}
        disabled={!state}
        onChange={(e) => onLga(e.target.value)}
      />
    </div>
  );
}