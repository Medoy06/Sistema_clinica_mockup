import { useState } from 'react';

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

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Sidebar = ({ currentPath, onNavigate }: SidebarProps) => {
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
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-700 text-xs text-slate-400">
          Sistema Clínica v1.0
        </div>
      )}
    </aside>
  );
};