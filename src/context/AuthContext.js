import React, { createContext, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingRole, setPendingRole] = useState(null);
  const [profile, setProfile] = useState(null);

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfile({
          ...data,
          full_name: data.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Citizen Hero',
          avatar_url: data.avatar_url || user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=300&q=80',
          email: user?.email
        });
        setRole(data.role);
      }
    } catch (e) {
      console.log('[AuthContext] Profile Fetch Err:', e);
    }
  };

  useEffect(() => {
    if (user) {
      refreshProfile();
    } else {
      setProfile(null);
      setRole(null);
    }
  }, [user]);

  useEffect(() => {
    console.log('[AuthContext] Initializing the Auth State...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error('[AuthContext] Session fetch error:', error);
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`[AuthContext] Auth State Changed: ${_event}`, !!session);
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session) => {
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      console.log('[AuthContext] User found, fetching profile role...');
      await fetchProfile(session.user);
    } else {
      console.log('[AuthContext] No user found, clearing role.');
      setRole(null);
      setLoading(false);
    }
  };

  const fetchProfile = async (userData) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
         console.error('[AuthContext] Error fetching profile:', error);
      }
      
      if (data) {
          console.log('[AuthContext] Profile found. Role is:', data.role, 'Pending Role is:', pendingRole);
          
          if (pendingRole && data.role !== pendingRole) {
              console.log(`[AuthContext] Switching OAuth existing role to match portal: ${pendingRole}`);
              await supabase.from('profiles').update({ role: pendingRole }).eq('id', userData.id);
              setRole(pendingRole);
              setPendingRole(null); // Clear it out
          } else {
              setRole(data.role);
          }
      } else {
          console.log('[AuthContext] Profile not found. Provisioning for new OAuth user...');
          await ensureProfile(userData, pendingRole || 'citizen');
          setPendingRole(null);
      }
    } catch (e) {
      console.error('[AuthContext] Unhandled error in fetchProfile:', e);
    } finally {
      setLoading(false);
    }
  };

  // Ensure role is provisioned for email logins
  const ensureProfile = async (userData, requiredRole = 'citizen') => {
      // 1. Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.id)
        .single();

      if (profile) {
          // Allow dynamic role switching for testing/prototyping so users can visit both portals
          if (profile.role !== requiredRole) {
              console.log(`[AuthContext] Switching existing role from ${profile.role} to ${requiredRole}`);
              await supabase.from('profiles').update({ role: requiredRole }).eq('id', userData.id);
              setRole(requiredRole);
          } else {
              setRole(profile.role);
          }
      } else {
          console.log(`[AuthContext] Auto-provisioning profile with role: ${requiredRole}`);
          const { error: upsertError } = await supabase.from('profiles').upsert({
              id: userData.id,
              email: userData.email,
              full_name: userData.user_metadata?.full_name || 'New Hero',
              role: requiredRole
          });
          
          if (upsertError) {
              console.error('[AuthContext] Failed to provision profile:', upsertError);
          } else {
              setRole(requiredRole);
          }
      }
  };

  const signIn = async (email, password, expectedRole = 'citizen') => {
    console.log('[AuthContext] Attempting SignIn for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) {
        console.error('[AuthContext] SignIn Error:', error.message);
        throw error;
    }
    
    // Ensure profile has the correct expected role if it's new
    if (data?.user) {
       await ensureProfile(data.user, expectedRole);
    }
    return data;
  };

  const signUp = async (email, password, full_name, expectedRole = 'citizen') => {
    console.log('[AuthContext] Attempting SignUp for:', email);
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name }
        }
    });

    if (error) {
        console.error('[AuthContext] SignUp Error:', error.message);
        throw error;
    }

    // Usually, signUp returns a user even before confirmation, or handles auto-login if confirmations are disabled
    if (data?.user) {
       await ensureProfile(data.user, expectedRole);
    }

    return data;
  };

  const signInWithGoogle = async (role = 'citizen') => {
    setPendingRole(role);
    const redirectUrl = AuthSession.makeRedirectUri();

    console.log("Redirect URL:", redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.log("ERROR:", error.message);
      throw error;
    }

    if (data?.url) {
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (res.type === 'success') {
        const { url } = res;
        const { params, errorCode } = QueryParams.getQueryParams(url);

        if (errorCode) {
          throw new Error(errorCode);
        }

        const { access_token, refresh_token } = params;

        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          
          if (sessionError) {
             throw sessionError;
          }
        }
      }
    }
  };

  const logout = async () => {
    console.log('[AuthContext] Signing Out');
    const { error } = await supabase.auth.signOut();
    if(error) console.error('[AuthContext] SignOut Error:', error.message);
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        session, 
        role, 
        profile,
        loading, 
        signIn,
        signUp,
        signInWithGoogle,
        logout,
        setRole,
        refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};