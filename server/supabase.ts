import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from '@supabase/supabase-js';

export class MissingSupabaseAdminEnvError extends Error {
  constructor() {
    super('SUPABASE_URL and SUPABASE_SECRET_KEY are required');
    this.name = 'MissingSupabaseAdminEnvError';
  }
}

const supabaseClientOptions: SupabaseClientOptions<'public'> = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

let cachedClient: SupabaseClient | null = null;
let cachedUrl: string | null = null;
let cachedSecretKey: string | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new MissingSupabaseAdminEnvError();
  }

  if (
    cachedClient &&
    cachedUrl === supabaseUrl &&
    cachedSecretKey === supabaseSecretKey
  ) {
    return cachedClient;
  }

  cachedUrl = supabaseUrl;
  cachedSecretKey = supabaseSecretKey;
  cachedClient = createClient(
    supabaseUrl,
    supabaseSecretKey,
    supabaseClientOptions
  );
  return cachedClient;
}
