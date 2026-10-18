/** Keep authentication on the selected theme's canvas so its logo and copy remain readable. */
export default function AuthBackdrop() {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-night" />;
}
