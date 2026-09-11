'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export type UserRole = 'alumno' | 'profesor' | 'academia';

export interface AuthProfile {
  id: string;
  name: string;
  role: UserRole;
  photo_url: string | null;
  photo_position: string | null;
  photo_zoom: number | null;
}

export interface AuthContextType {
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  isLoggedIn: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  profile: null,
  loading: false,
  isLoggedIn: false,
  signOut: async () => {},
  refreshProfile: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, name, role, photo_url, photo_position, photo_zoom')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile(data as AuthProfile);
    }
    return data;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function initAuth() {
      // 1. Verificación rápida local: si no hay sesión en cookies/almacenamiento,
      // el visitante es anónimo. Evitamos un roundtrip HTTP a /auth/v1/user
      // que devolvería 403 innecesariamente.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      // 2. Si hay sesión local, validamos el token con el servidor de Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      setUser(user);
      if (user) {
        await fetchProfile(user.id);
      } else {
        setProfile(null);
      }
      if (isMounted) setLoading(false);
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    profile,
    loading,
    isLoggedIn: !!user,
    signOut,
    refreshProfile,
  }), [user, profile, loading, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
