import { EndScreen } from "../EndScreen";

/** Starts with the box already open: the prize, then the preview on the fox. */
export default function Prize() {
  return <EndScreen start="prize" variant="full" />;
}
