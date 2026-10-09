import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Marca } from './Marca';
import { Users, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

// `ativoEm`: rotas de detalhe que também acendem o item (o fluxo cliente → levantamento é todo de Clientes)
const navItems = [
  { to: '/', label: 'Clientes', icon: Users, end: true, ativoEm: /^\/(clientes|levantamentos)\/\d+/ },
  // Placeholders ("Em construção") — reativar quando as telas estiverem prontas.
  // As rotas continuam no router.
  // { to: '/levantamentos', label: 'Levantamentos', icon: ClipboardList },
  // { to: '/relatorios', label: 'Relatórios', icon: FileText },
];

function iniciais(nome?: string) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

export function Layout() {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { pathname } = useLocation();
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
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-1 h-14 px-1.5 bg-neutral-900 text-white shadow-sm">
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          className="h-11 w-11 flex items-center justify-center rounded-lg hover:bg-white/10"
        >
          <Menu size={22} />
        </button>
        <Marca compacto />
      </header>

      {menuAberto && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 animate-fade-in"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* Sidebar: off-canvas no mobile, fixa a partir de md */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw] bg-neutral-900 text-white flex flex-col transition-transform duration-200 ease-out md:sticky md:top-0 md:h-screen md:translate-x-0 md:transition-none ${
          menuAberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 flex items-center justify-between">
          <Marca />
          <button
            type="button"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
            className="md:hidden h-11 w-11 -mr-2 flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end, ativoEm }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuAberto(false)}
              className={({ isActive: ativoRota }) => {
                const isActive = ativoRota || ativoEm.test(pathname);
                return `relative flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/[0.08] text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-vr-500'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`;
              }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive || ativoEm.test(pathname) ? 'text-vr-400' : ''} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <span
              aria-hidden="true"
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-vr-500/15 text-vr-400 text-sm font-bold"
            >
              {iniciais(usuario?.nome)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{usuario?.nome}</p>
              <p className="text-xs text-white/50 capitalize">{usuario?.perfil.toLowerCase()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 w-full flex items-center gap-2 px-3 min-h-11 md:min-h-9 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
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
