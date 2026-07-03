import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { BitacorasPage } from "@/features/bitacoras/BitacorasPage";
import { BalancePage } from "@/features/balance/BalancePage";
import { ClienteCreatePage, ClienteDetailPage } from "@/features/clientes/ClienteDetailPage";
import { ClientesPage } from "@/features/clientes/ClientesPage";
import { CotizacionesPage } from "@/features/cotizaciones/CotizacionesPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { HistorialPage } from "@/features/historial/HistorialPage";
import { MotoCreatePage, MotoDetailPage } from "@/features/motocicletas/MotoDetailPage";
import { MotocicletasPage } from "@/features/motocicletas/MotocicletasPage";
import { PortalClientePage } from "@/features/portal-cliente/PortalClientePage";

function PrivateRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/clientes/nuevo" element={<ClienteCreatePage />} />
        <Route path="/clientes/:id" element={<ClienteDetailPage />} />
        <Route path="/motocicletas" element={<MotocicletasPage />} />
        <Route path="/motocicletas/nueva" element={<MotoCreatePage />} />
        <Route path="/motocicletas/:id" element={<MotoDetailPage />} />
        <Route path="/ordenes" element={<Navigate to="/bitacoras" replace />} />
        <Route path="/ordenes/nueva" element={<Navigate to="/bitacoras" replace />} />
        <Route path="/ordenes/:id" element={<Navigate to="/bitacoras" replace />} />
        <Route path="/bitacoras" element={<BitacorasPage />} />
        <Route path="/historial" element={<HistorialPage />} />
        <Route path="/cotizaciones" element={<CotizacionesPage />} />
        <Route path="/balance" element={<BalancePage />} />
        <Route path="/kanban" element={<Navigate to="/bitacoras" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/consulta" element={<PortalClientePage />} />
      <Route path="/consulta/:codigo" element={<PortalClientePage />} />
      <Route path="/*" element={<PrivateRoutes />} />
    </Routes>
  );
}
