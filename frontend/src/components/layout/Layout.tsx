import { Sidebar } from './Sidebar';
import type { User } from '../../services/auth.service';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  user: User;
  onLogout: () => void;
  unreadCount: number;
}

export const Layout = ({ children, currentPath, onNavigate, user, onLogout, unreadCount }: LayoutProps) => {
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
        unreadCount={unreadCount}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};