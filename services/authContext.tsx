
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { getUserByEmail, getRoleById } from './firestoreService';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  login: (email: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUserData: (data: Partial<User>) => void;
  checkPermission: (key: keyof UserRole['permissions']) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: false,
  login: async () => ({ success: false }),
  logout: () => {},
  updateUserData: () => {},
  checkPermission: () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Default permissions for super admin fallback
  const superAdminRole: UserRole = {
    id: 'super_admin_role',
    name: 'Super Admin',
    permissions: {
      view_dashboard: true,
      manage_users: true,
      manage_roles: true,
      manage_supplies: true,
      manage_projects: true,
      access_all_projects: true,
      inventory_view: true,
      inventory_add: true,
      inventory_edit: true,
      inventory_delete: true
    }
  };

  const fetchUserRole = async (userData: User) => {
    if (userData.role === 'admin' && !userData.roleId) {
      setUserRole(superAdminRole);
      return;
    }

    if (userData.roleId) {
      const role = await getRoleById(userData.roleId);
      if (role) {
        setUserRole(role);
      } else {
        // Fallback if roleId exists but role document is missing
        setUserRole(null); 
      }
    } else {
      // User with no role ID and not hardcoded admin
      setUserRole(null);
    }
  };

  useEffect(() => {
    // Check local storage for persisted "mock" session
    const loadSession = async () => {
      const storedUser = localStorage.getItem('otrack_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        await fetchUserRole(parsedUser);
      }
      setLoading(false);
    };
    loadSession();
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
          roleId: 'super_admin',
          assignedProjects: []
        };
        
        try {
           const dbUser = await getUserByEmail(email);
           if (dbUser) {
             setUser(dbUser);
             localStorage.setItem('otrack_user', JSON.stringify(dbUser));
             await fetchUserRole(dbUser);
             return { success: true };
           }
        } catch (e) {
           // ignore error, use hardcoded
        }
        
        setUser(superAdmin);
        setUserRole(superAdminRole);
        localStorage.setItem('otrack_user', JSON.stringify(superAdmin));
        return { success: true };
      }

      const dbUser = await getUserByEmail(email);
      
      if (dbUser) {
        setUser(dbUser);
        localStorage.setItem('otrack_user', JSON.stringify(dbUser));
        await fetchUserRole(dbUser);
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
    setUserRole(null);
    localStorage.removeItem('otrack_user');
  };

  const updateUserData = (data: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...data };
      setUser(newUser);
      localStorage.setItem('otrack_user', JSON.stringify(newUser));
      // Optionally refetch role if roleId changed
      if (data.roleId) {
        fetchUserRole(newUser);
      }
    }
  };

  const checkPermission = (key: keyof UserRole['permissions']): boolean => {
    // Legacy support for hardcoded admin
    if (user?.role === 'admin') return true;
    
    if (!userRole) return false;
    return !!userRole.permissions[key];
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, login, logout, updateUserData, checkPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
