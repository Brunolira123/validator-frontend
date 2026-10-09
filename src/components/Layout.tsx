import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, FileText, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/levantamentos', label: 'Levantamentos', icon: ClipboardList },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
];

export function Layout() {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!menuAberto) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAberto(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [menuAberto]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen md:flex">
      {/* Topbar (mobile) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-1 h-14 px-1.5 bg-vr-900 text-white">
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          className="h-11 w-11 flex items-center justify-center rounded-lg hover:bg-white/10"
        >
          <Menu size={22} />
        </button>
        <span className="font-bold">Validador VR</span>
      </header>

      {menuAberto && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* Sidebar: off-canvas no mobile, fixa a partir de md */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw] bg-vr-900 text-white flex flex-col transition-transform md:static md:translate-x-0 md:transition-none ${
          menuAberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-white/10 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">Validador VR</h1>
            <p className="text-xs text-white/60 mt-1">Infraestrutura</p>
          </div>
          <button
            type="button"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
            className="md:hidden h-11 w-11 -mr-3 -mt-2 flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="text-sm text-white/70 mb-1 truncate">
            {usuario?.nome}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 min-h-11 md:min-h-0 text-sm text-white/70 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
