import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type AppUser } from '../lib/store';
import { supabase } from '../lib/supabase';
import { message } from 'antd';

interface AuthContextType {
    user: AppUser | null;
    login: (email: string, password?: string) => Promise<boolean>;
    logout: () => Promise<void>;
    updateProfile: (fullName: string) => Promise<void>;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string, email: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
                return;
            }

            if (data) {
                setUser({
                    id: data.id,
                    email: data.email || email,
                    fullName: data.full_name,
                    role: data.role as 'admin' | 'colab'
                });
            } else {
                // Si no existe perfil (ej. primera vez admin), creamos un fallback visual
                setUser({
                    id: userId,
                    email: email,
                    fullName: email.split('@')[0],
                    role: 'colab' // Default fallback
                });
            }
        } catch (err) {
            console.error('Error in fetchProfile:', err);
        }
    };

    useEffect(() => {
        // Fetch current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email || '');
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email || '').then(() => setLoading(false));
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password?: string): Promise<boolean> => {
        if (!password) {
            message.error('Por favor, ingresa tu contraseña.');
            return false;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error("Login error:", error.message);
                message.error('Credenciales incorrectas. Verifique su correo electrónico y contraseña.');
                return false;
            }

            if (data.session) {
                // Await profile strictly before returning to avoid race condition with ProtectedRoute
                await fetchProfile(data.session.user.id, data.session.user.email || '');
                message.success('Bienvenido al sistema');
                return true;
            }
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        message.info('Sesión cerrada correctamente');
    };

    const updateProfile = async (fullName: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: fullName })
                .eq('id', user.id);

            if (error) throw error;

            setUser({ ...user, fullName });
            message.success('Perfil actualizado correctamente');
        } catch (error: any) {
            console.error("Error updating profile:", error);
            message.error("Error al actualizar el perfil en la base de datos");
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            updateProfile,
            isAuthenticated: !!user,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
