// TEMPORARY: the travelling background, live, for the founder to judge before it goes on the home page.
import { notFound } from "next/navigation";
import Flight from "./Flight";

export const metadata = { robots: { index: false }, title: "Travelling background (temporary)" };

export default function LabJourney() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Flight />;
}
