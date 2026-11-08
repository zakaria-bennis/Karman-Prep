/* The parent types the code from their student's "Invite a parent" page. */
import { Cta } from "@/components/portal";
import { linkStudentWithCodeAction } from "@/app/dashboard/parent/actions";

export function LinkStudentForm({ label = "Link student" }: { label?: string }) {
  return (
    <form action={linkStudentWithCodeAction} className="kp-form">
      <label className="kp-field">
        <span>Code from your student</span>
        <input
          className="kp-input"
          name="code"
          required
          maxLength={20}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="K7Q2-MP4X"
        />
      </label>
      <div>
        <Cta type="submit">{label}</Cta>
      </div>
    </form>
  );
}
