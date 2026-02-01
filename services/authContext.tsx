
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getUserByEmail } from './firestoreService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUserData: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  login: async () => ({ success: false }),
  logout: () => {},
  updateUserData: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persisted "mock" session
    const storedUser = localStorage.getItem('otrack_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string) => {
    setLoading(true);
    try {
      // Hardcoded Super Admin for bootstrap (if no users in DB yet)
      if (email === 'admin@otrack.com') {
        const superAdmin: User = {
          uid: 'super-admin',
          email: 'admin@otrack.com',
          name: 'Super Admin',
          role: 'admin',
          assignedProjects: []
        };
        // Attempt to fetch if exists in DB to get preferences, otherwise use default
        try {
           const dbUser = await getUserByEmail(email);
           if (dbUser) {
             setUser(dbUser);
             localStorage.setItem('otrack_user', JSON.stringify(dbUser));
             return { success: true };
           }
        } catch (e) {
           // ignore error, use hardcoded
        }
        
        setUser(superAdmin);
        localStorage.setItem('otrack_user', JSON.stringify(superAdmin));
        return { success: true };
      }

      const dbUser = await getUserByEmail(email);
      
      if (dbUser) {
        setUser(dbUser);
        localStorage.setItem('otrack_user', JSON.stringify(dbUser));
        return { success: true };
      } else {
        return { success: false, message: 'Email não encontrado ou não autorizado.' };
      }
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Erro ao conectar com o banco de dados.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('otrack_user');
  };

  const updateUserData = (data: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...data };
      setUser(newUser);
      localStorage.setItem('otrack_user', JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
};
