/*
 * Settings, Appearance. There is nothing to choose: the theme follows the device (design rule 33)
 * and the accent color comes from each day's painting. This says so plainly.
 */
import s from "@/components/student-portal/settings/settings.module.css";

export default function Appearance() {
  return (
    <>
      <div className={s.fact}>
        <b>Light or dark</b>
        <span>Follows your device. Change it in your device&rsquo;s display settings.</span>
      </div>
      <div className={s.fact}>
        <b>Accent color</b>
        <span className={s.swatch}>
          <i aria-hidden="true" />
          Picked from today&rsquo;s painting, new each day.
        </span>
      </div>
    </>
  );
}
