import type { User } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

export type AppRole = Database['public']['Enums']['app_role'];
export type UserStatus = Database['public']['Enums']['user_status'];
export type UserProfile = Database['public']['Tables']['users']['Row'];

export interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
