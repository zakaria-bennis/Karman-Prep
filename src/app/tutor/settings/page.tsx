import { redirect } from "next/navigation";

// The Settings tab opens booking settings; payment settings are linked from there.
export default function TutorSettingsPage() {
  redirect("/tutor/settings/booking");
}
