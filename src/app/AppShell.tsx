import { Bike, BookOpen, FileText, Home, Users, Wrench } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AuthPage } from "@/features/auth/AuthPage";
import { hasSupabaseCredentials, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useWorkshopStore } from "@/stores/workshopStore";

const nav = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/motocicletas", label: "Motos", icon: Bike },
  { to: "/bitacoras", label: "Bitacoras", icon: BookOpen },
  { to: "/cotizaciones", label: "Cotizaciones", icon: FileText },
];

function NavItem({ item, mobile = false }: { item: (typeof nav)[number]; mobile?: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        `flex items-center ${mobile ? "flex-col justify-center gap-1 text-[11px]" : "gap-3 rounded-lg px-3 py-2 text-sm"} font-semibold transition ${
          isActive ? "bg-neutral-950 text-white" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
        }`
      }
    >
      <Icon className={mobile ? "h-5 w-5" : "h-4 w-4"} />
      {item.label}
    </NavLink>
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

  useEffect(() => {
    if (!supabase || !user) return;

    supabase.auth.getSession().then(({ data }) => {
      const active = Boolean(data.session);
      setHasSession(active);
      void loadFromSupabase();
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      if (session) void loadFromSupabase();
    });

    return () => data.subscription.unsubscribe();
  }, [loadFromSupabase, user]);

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-neutral-200 bg-white p-4 lg:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-950 text-white">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-bold">MotoFlow</p>
            <p className="text-xs text-neutral-500">Taller de motocicletas</p>
          </div>
        </div>
        <nav className="space-y-1">
          {nav.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-500">MotoFlow</p>
              <p className="text-lg font-bold">Panel del taller</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600">
                {usingSupabase ? (hasSession ? "Supabase activo" : "Supabase sin Auth") : "Modo local"}
              </span>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                {user.name} · {user.role}
              </span>
              <button className="text-xs font-semibold text-neutral-500 hover:text-neutral-950" onClick={() => { void supabase?.auth.signOut(); logout(); }}>
                Salir
              </button>
            </div>
          </div>
          {isLoading ? <p className="mt-2 text-xs font-semibold text-neutral-500">Cargando datos de Supabase...</p> : null}
          {error ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p> : null}
        </header>

        <main className="mx-auto max-w-7xl px-4 py-5 pb-24 lg:px-8 lg:pb-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-neutral-200 bg-white px-2 py-2 lg:hidden">
        {nav.map((item) => (
          <NavItem key={item.to} item={item} mobile />
        ))}
      </nav>
    </div>
  );
}
