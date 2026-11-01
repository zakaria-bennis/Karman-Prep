import { EndScreen } from "../EndScreen";

/** Not enough tokens for a box yet: the tokens land in the top bar on the results. */
export default function ResultsNoBox() {
  return <EndScreen start="results" variant="no-box" />;
}
