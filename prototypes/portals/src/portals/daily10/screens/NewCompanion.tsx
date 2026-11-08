import { EndScreen } from "../EndScreen";

/** The new companion's moment, held so it can be looked at; the full ending moves on after it. */
export default function NewCompanion() {
  return <EndScreen start="companion" variant="full" hold />;
}
