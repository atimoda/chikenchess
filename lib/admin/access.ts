import type { User } from '@supabase/supabase-js'

/** Application permission, independent of Supabase's authenticated database role. */
export function isAdminUser(user: Pick<User, 'app_metadata' | 'is_anonymous'> | null | undefined): boolean {
  return Boolean(user && !user.is_anonymous && user.app_metadata?.access_level === 'admin')
}
