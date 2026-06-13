import { useState } from 'react';
import type { User } from '../../services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Inicio', path: '/', icon: '🏥' },
  { label: 'Inventario', path: '/inventario', icon: '📦' },
  { label: 'Citas', path: '/citas', icon: '📅' },
  { label: 'Pacientes', path: '/pacientes', icon: '👤' },
  { label: 'Comunicaciones', path: '/comunicaciones', icon: '✉️' },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  doctor: 'Doctor',
  recepcionista: 'Recepcionista',
  enfermera: 'Enfermera',
};

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  user: User;
  onLogout: () => void;
  unreadCount: number;
}

export const Sidebar = ({ currentPath, onNavigate, user, onLogout, unreadCount }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`
      bg-slate-800 text-white flex flex-col transition-all duration-300
      ${collapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!collapsed && (
          <span className="font-bold text-lg">Clínica</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white transition-colors ml-auto"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4">
        {navItems.map(item => (
          <button
  key={item.path}
  onClick={() => onNavigate(item.path)}
  className={`
    w-full flex items-center gap-3 px-4 py-3 text-left
    transition-colors hover:bg-slate-700
    ${currentPath === item.path ? 'bg-slate-700 border-r-2 border-blue-400' : ''}
  `}
>
  <span className="text-xl">{item.icon}</span>
  {!collapsed && (
    <span className="flex-1 text-sm font-medium">{item.label}</span>
  )}
  {!collapsed && item.path === '/citas' && unreadCount > 0 && (
    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {unreadCount}
    </span>
  )}
</button>
        ))}
      </nav>

      {/* User info and logout */}
      <div className="border-t border-slate-700 p-4">
        {!collapsed ? (
          <div>
            <p className="text-sm font-medium text-white truncate">
              {user.full_name}
            </p>
            <p className="text-xs text-slate-400 mb-3">
              {roleLabels[user.role]}
            </p>
            <button
              onClick={onLogout}
              className="w-full text-xs text-slate-400 hover:text-white hover:bg-slate-700 py-1.5 rounded transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className="w-full text-slate-400 hover:text-white transition-colors text-lg"
            title="Cerrar sesión"
          >
            ↩
          </button>
        )}
      </div>
    </aside>
  );
};