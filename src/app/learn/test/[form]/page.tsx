// The old four practice tests are replaced by the twenty full-length exams (/learn/tests).
import { redirect } from "next/navigation";

export default function OldTestPage() {
  redirect("/learn/tests");
}
