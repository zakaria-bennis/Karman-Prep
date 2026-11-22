// /dev/lessons: every skill's lesson and video on the skill page's glass, one at a time, with a switch
// for light and dark, for checking the lessons by eye. ?skill=m-circles opens one; ?night=0 is light.
// Production builds return 404.
import { notFound } from "next/navigation";
import LessonsLab from "./LessonsLab";

export default async function LessonsDevPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  const skill = typeof q.skill === "string" ? q.skill : "m-circles";
  return <LessonsLab skill={skill} night={q.night !== "0"} />;
}
