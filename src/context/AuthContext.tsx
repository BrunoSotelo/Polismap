
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface UserProfile {
    id: string;
    email: string;
    is_admin: boolean;
    theme_id?: string; // New field for personalization
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    assignedDistricts: number[];
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [assignedDistricts, setAssignedDistricts] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Get Initial Session with Timeout (Prevent Hanging)
        const checkSession = async () => {
            try {
                const { data } = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise<{ data: { session: null } }>((_, reject) =>
                        setTimeout(() => reject(new Error('Auth timeout - database might be waking up')), 15000)
                    )
                ]) as { data: { session: Session | null } };

                const session = data.session;
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await fetchProfileAndDistricts(session.user.id);
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.warn("Auth Info:", error);
                // Fallback to "No Session" after timeout
                setLoading(false);
            }
        };

        checkSession();

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfileAndDistricts(session.user.id);
            } else {
                setProfile(null);
                setAssignedDistricts([]);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfileAndDistricts = async (userId: string) => {
        try {
            // A. Fetch Profile (is_admin, theme_id)
            // Note: If profile doesn't exist yet (first login), trigger handles it, but client might need retry or strict RLS allows read.
            // Using maybeSingle to avoid 406 if row missing.
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            // Force cast effectively implies we trust the shape or handle null
            const typedProfile = profileData as unknown as UserProfile;

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Error fetching profile:', profileError);
            }

            setProfile(typedProfile);

            // B. Fetch Districts
            if (typedProfile?.is_admin) {
                // Admins see all districts (e.g. 1-6)
                setAssignedDistricts([1, 2, 3, 4, 5, 6]);
            } else {
                const { data: districtsData, error: distError } = await supabase
                    .from('user_districts')
                    .select('distrito_id')
                    .eq('user_id', userId);

                if (distError) {
                    console.error('Error fetching districts:', distError);
                }

                if (districtsData) {
                    setAssignedDistricts((districtsData as any[]).map(d => d.distrito_id));
                }
            }

        } catch (error) {
            console.error("Auth Load Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        session,
        user,
        profile,
        assignedDistricts,
        loading,
        signOut
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
