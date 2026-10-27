import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { Business, UserRole } from '../types';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  business: Business | null;
  role: UserRole;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: { email: string; password: string; businessName: string; phone?: string; ownerName?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  demoSignIn: (type?: 'owner' | 'seller') => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_USER_KEY = 'optom_auth_current_user_v1';
const AUTH_USERS_DB_KEY = 'optom_auth_registered_users_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [role, setRole] = useState<UserRole>('owner');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      if (isSupabaseConfigured && supabase) {
        // Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const u: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name,
            phone: session.user.user_metadata?.phone,
          };
          setUser(u);

          // Fetch business & membership from Supabase
          const { data: memberData } = await supabase
            .from('memberships')
            .select('role, business_id, businesses(*)')
            .eq('user_id', session.user.id)
            .single();

          if (memberData?.businesses) {
            setBusiness(memberData.businesses as any);
            setRole(memberData.role as UserRole);
          }
        }
      } else {
        // Local multi-tenant session
        const raw = localStorage.getItem(AUTH_USER_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setUser(parsed.user);
            setBusiness(parsed.business);
            setRole(parsed.role || 'owner');
          } catch (e) {
            console.error("Auth restore error", e);
          }
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        if (data.user) {
          const u: AuthUser = {
            id: data.user.id,
            email: data.user.email || '',
            full_name: data.user.user_metadata?.full_name,
            phone: data.user.user_metadata?.phone,
          };
          setUser(u);

          const { data: memberData } = await supabase
            .from('memberships')
            .select('role, business_id, businesses(*)')
            .eq('user_id', data.user.id)
            .single();

          if (memberData?.businesses) {
            setBusiness(memberData.businesses as any);
            setRole(memberData.role as UserRole);
          }
        }
      } else {
        // Local multi-tenant authentication
        const allUsersRaw = localStorage.getItem(AUTH_USERS_DB_KEY);
        const registeredUsers: Array<{
          user: AuthUser;
          business: Business;
          role: UserRole;
          passwordHash: string;
        }> = allUsersRaw ? JSON.parse(allUsersRaw) : [];

        const found = registeredUsers.find(
          u => u.user.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password
        );

        if (!found) {
          throw new Error("Email yoki parol noto'g'ri! Iltimos, tekshirib qayta urinib ko'ring.");
        }

        setUser(found.user);
        setBusiness(found.business);
        setRole(found.role);

        localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
          user: found.user,
          business: found.business,
          role: found.role
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (params: {
    email: string;
    password: string;
    businessName: string;
    phone?: string;
    ownerName?: string;
  }) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            data: {
              full_name: params.ownerName,
              phone: params.phone,
              business_name: params.businessName
            }
          }
        });
        if (error) throw error;
        if (data.user) {
          const u: AuthUser = {
            id: data.user.id,
            email: data.user.email || '',
            full_name: params.ownerName,
            phone: params.phone,
          };
          setUser(u);

          // Create business and membership via Supabase
          const { data: newBiz, error: bizErr } = await supabase
            .from('businesses')
            .insert({
              name: params.businessName,
              phone: params.phone,
              address: ''
            })
            .select()
            .single();

          if (!bizErr && newBiz) {
            setBusiness(newBiz);
            await supabase.from('memberships').insert({
              business_id: newBiz.id,
              user_id: data.user.id,
              role: 'owner'
            });
            setRole('owner');
          }
        }
      } else {
        // Local isolated multi-tenant sign-up
        const allUsersRaw = localStorage.getItem(AUTH_USERS_DB_KEY);
        const registeredUsers: Array<{
          user: AuthUser;
          business: Business;
          role: UserRole;
          passwordHash: string;
        }> = allUsersRaw ? JSON.parse(allUsersRaw) : [];

        // Check if email already exists
        const exists = registeredUsers.some(
          u => u.user.email.toLowerCase() === params.email.toLowerCase()
        );
        if (exists) {
          throw new Error("Ushbu email manzili bilan allaqachon ro'yxatdan o'tilgan!");
        }

        const newUserId = 'usr-' + Math.random().toString(36).substring(2, 9);
        const newBizId = 'biz-' + Math.random().toString(36).substring(2, 9);

        const newUser: AuthUser = {
          id: newUserId,
          email: params.email,
          full_name: params.ownerName || params.businessName,
          phone: params.phone
        };

        const newBiz: Business = {
          id: newBizId,
          name: params.businessName,
          phone: params.phone,
          address: '',
          created_at: new Date().toISOString()
        };

        const entry = {
          user: newUser,
          business: newBiz,
          role: 'owner' as UserRole,
          passwordHash: params.password
        };

        registeredUsers.push(entry);
        localStorage.setItem(AUTH_USERS_DB_KEY, JSON.stringify(registeredUsers));

        setUser(newUser);
        setBusiness(newBiz);
        setRole('owner');

        localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
          user: newUser,
          business: newBiz,
          role: 'owner'
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setBusiness(null);
      setRole('owner');
      localStorage.removeItem(AUTH_USER_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo account instant login for convenience
  const demoSignIn = (demoRole: 'owner' | 'seller' = 'owner') => {
    const demoUser: AuthUser = {
      id: 'demo-user-1',
      email: 'demo@optomdaftar.uz',
      full_name: "Bahodirov Muhammadamin",
      phone: "+998 90 123 45 67"
    };

    const demoBiz: Business = {
      id: 'biz-default',
      name: "Baraka Ulgurji Savdo",
      phone: "+998 90 999 88 77",
      address: "Toshkent sh., Qo'yliq bozori 7-blok",
      created_at: new Date().toISOString()
    };

    setUser(demoUser);
    setBusiness(demoBiz);
    setRole(demoRole);

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
      user: demoUser,
      business: demoBiz,
      role: demoRole
    }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      business,
      role,
      isLoading,
      signIn,
      signUp,
      signOut,
      demoSignIn
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
