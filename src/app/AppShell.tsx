import { Bike, BookOpen, FileClock, FileText, Home, LogOut, Menu, PieChart, Users, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AuthPage } from "@/features/auth/AuthPage";
import { hasSupabaseCredentials, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useWorkshopStore } from "@/stores/workshopStore";
import { canManageWorkshop, roleLabel } from "@/utils/permissions";

const nav = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/motocicletas", label: "Motos", icon: Bike },
  { to: "/bitacoras", label: "Trabajos", icon: BookOpen },
  { to: "/historial", label: "Historial", icon: FileClock },
  { to: "/cotizaciones", label: "Cotizaciones", icon: FileText },
  { to: "/balance", label: "Balance", icon: PieChart, managerOnly: true },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#F2B705]/20 bg-[#F2B705]/10 text-[#FFD08A] shadow-[0_0_28px_rgba(242,183,5,0.2)]">
        <Bike className="h-6 w-6" />
      </div>
      <div>
        <p className="text-lg font-semibold tracking-wide text-white">MOTO-FLOW</p>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFF2E1]/60">Taller de Motos Villa</p>
      </div>
    </div>
  );
}

function NavItem({ item, onClick }: { item: (typeof nav)[number]; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition duration-200 active:scale-[0.98] ${
          isActive
            ? "bg-[#F2B705] text-[#0B0B0B] shadow-lg shadow-black/20"
            : "text-[#FFF2E1]/60 hover:bg-white/8 hover:text-white"
        }`
      }
    >
      <Icon className="h-5 w-5 transition group-hover:scale-110" />
      {item.label}
    </NavLink>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((state) => state.user);
  const visibleNav = nav.filter((item) => !item.managerOnly || canManageWorkshop(user));

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#0B0B0B] px-4 py-5 text-white">
      <Brand />
      <nav className="mt-8 space-y-2">
        {visibleNav.map((item) => (
          <NavItem key={item.to} item={item} onClick={onNavigate} />
        ))}
      </nav>
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[#FFF2E1]/75">
        <p className="font-semibold text-white">Flujo activo</p>
        <p className="mt-1">Cliente, moto, trabajo activo, historial y cotizacion en un solo expediente.</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const usingSupabase = useWorkshopStore((state) => state.usingSupabase);
  const isLoading = useWorkshopStore((state) => state.isLoading);
  const error = useWorkshopStore((state) => state.error);
  const loadFromSupabase = useWorkshopStore((state) => state.loadFromSupabase);
  const [hasSession, setHasSession] = useState(!hasSupabaseCredentials);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!supabase || !user) return;

    supabase.auth.getSession().then(({ data }) => {
      const active = Boolean(data.session);
      setHasSession(active);
      if (active) {
        void loadFromSupabase();
      } else {
        logout();
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      if (session) {
        void loadFromSupabase();
      } else {
        logout();
      }
    });

    return () => data.subscription.unsubscribe();
  }, [loadFromSupabase, logout, user]);

  if (!user) return <AuthPage />;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#0B0B0B] text-[#FFF2E1]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 lg:block">
        <Sidebar />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menu"
            className="absolute inset-0 bg-[#0B0B0B]/70 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[min(82vw,320px)] animate-[slideIn_.22s_ease-out] border-r border-white/10 shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-white transition hover:bg-white/15 active:scale-95"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="w-full min-w-0 max-w-full lg:pl-72">
        <header className="border-b border-white/10 bg-[#0B0B0B]/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:sticky lg:top-0 lg:z-20 lg:px-8">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/8 text-white transition hover:bg-[#F2B705] hover:text-[#0B0B0B] active:scale-95 lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-[#FFD08A]">MotoFlow</p>
                <p className="truncate text-lg font-semibold text-white">Panel del taller</p>
              </div>
            </div>
            <div className="flex min-w-0 shrink items-center justify-end gap-2">
              <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[#FFF2E1]/75 sm:inline-flex">
                {usingSupabase ? (hasSession ? "Supabase activo" : "Supabase conectado") : "Modo local"}
              </span>
              <span className="max-w-[88px] truncate rounded-full bg-[#F2B705]/10 px-2.5 py-1 text-xs font-semibold text-[#FFF2E1] min-[380px]:max-w-[140px] sm:max-w-none sm:px-3">
                {user.name} | {roleLabel(user)}
              </span>
              <button
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/8 text-[#FFF2E1]/75 transition hover:bg-red-500 hover:text-white active:scale-95"
                onClick={() => logout()}
                aria-label="Salir"
                type="button"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          {isLoading ? <p className="mt-2 text-xs font-semibold text-[#FFF2E1]/60">Cargando datos de Supabase...</p> : null}
          {error ? <p className="mt-2 rounded-2xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">{error}</p> : null}
        </header>

        <main className="mx-auto w-full min-w-0 max-w-7xl overflow-x-clip px-4 pb-24 pt-5 sm:px-6 sm:pb-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
