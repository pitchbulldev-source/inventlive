import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * Cliente con service_role: BYPASSA RLS. Solo server-side y SOLO tras verificar
 * auth/permiso a mano. Se usa para operaciones de sistema (webhooks de pago,
 * confirmar compras vía credit_purchase, tareas admin). `import 'server-only'`
 * evita que se bundlee accidentalmente en el browser.
 */
export function createAdmin() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
