import React from 'react';
import { Menu, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../../services/authContext';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between bg-white px-4 shadow-sm lg:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <Menu size={24} />
        </button>
        <span className="text-xl font-bold text-primary">OTrack</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden flex-col items-end md:flex">
          <span className="text-sm font-medium text-gray-900">{user?.name || user?.email}</span>
          <span className="text-xs text-gray-500 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
        </div>
        <div className="flex items-center gap-2 border-l pl-4">
          <button onClick={logout} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Sair">
             <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;