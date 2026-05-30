import { createClient } from "@supabase/supabase-js";
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const { data } = await sb
  .from("quiz_questions")
  .select("*")
  .eq("source_pdf", "202406asiav2.pdf")
  .limit(1);
if (data && data[0]) console.log(Object.keys(data[0]).sort().join("\n"));
