import { createClient } from "@/lib/supabase/server";

/** Usuario verificado (getUser valida el JWT contra Supabase). null si no hay sesión. */
export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
