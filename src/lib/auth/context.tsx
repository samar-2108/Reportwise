"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProfileRow } from "@/types/database";

interface AuthContextType {
  user: User | null;
  profile: ProfileRow | null;
  loading: boolean;
  signInWithGoogle: (nextUrl?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function loadUserSession() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        setUser(currentUser ?? null);
        // Unblock loading state immediately so pages render without buffering
        setLoading(false);

        if (currentUser) {
          try {
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", currentUser.id)
              .maybeSingle();

            setProfile(userProfile);
          } catch {
            // Profile fetch error is non-fatal
          }
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.warn("Error fetching current user session:", err);
        setLoading(false);
      }
    }

    loadUserSession();

    // Listen to real-time auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      // Unblock immediately on any session update
      setLoading(false);

      if (currentUser) {
        try {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();

          setProfile(userProfile);
        } catch {
          // Profile fetch error is non-fatal
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (nextUrl: string = "/") => {
    const supabase = getSupabaseBrowserClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("Google OAuth error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
