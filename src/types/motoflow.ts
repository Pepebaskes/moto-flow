export type PrioridadOrden = "baja" | "media" | "alta" | "urgente";

export type EstadoOrden =
  | "recibida"
  | "diagnostico"
  | "esperando_autorizacion"
  | "autorizada"
  | "esperando_refacciones"
  | "en_reparacion"
  | "lista"
  | "entregada"
  | "cancelada";

export type TipoEvidencia = "entrada" | "proceso" | "salida";

export type BaseEntity = {
  id: string;
  taller_id: string;
  created_at: string;
  updated_at: string;
};

export type Cliente = BaseEntity & {
  nombre: string;
  telefono: string;
  email?: string;
  localidad?: string;
  notas?: string;
};

export type Motocicleta = BaseEntity & {
  cliente_id: string;
  marca: string;
  modelo: string;
  anio: number;
  placas: string;
  color: string;
  kilometraje: number;
  fecha_estimada_salida?: string;
  numero_serie?: string;
  notas?: string;
};

export type OrdenTrabajo = BaseEntity & {
  moto_id: string;
  cliente_id: string;
  titulo: string;
  descripcion_problema: string;
  diagnostico?: string;
  prioridad: PrioridadOrden;
  estado: EstadoOrden;
  fecha_entrada: string;
  fecha_estimada?: string;
  total_estimado?: number;
  total_final?: number;
  notas_internas?: string;
  notas_publicas?: string;
  codigo_publico: string;
};

export type Evidencia = BaseEntity & {
  orden_id?: string;
  moto_id?: string;
  movimiento_id?: string;
  url: string;
  tipo: TipoEvidencia;
  nota?: string;
  publico?: boolean;
};

export type MovimientoOrden = BaseEntity & {
  orden_id?: string;
  moto_id?: string;
  estado_anterior?: EstadoOrden;
  estado_nuevo?: EstadoOrden;
  tipo: "entrada" | "proceso" | "salida" | "estado" | "avance" | "cotizacion" | "nota";
  titulo: string;
  nota?: string;
  publico: boolean;
  costo?: number;
  kilometraje?: number;
};

export type CotizacionItem = {
  id: string;
  concepto: string;
  cantidad: number;
  precio_unitario: number;
  proveedor?: string;
};

export type Cotizacion = BaseEntity & {
  cliente_id: string;
  moto_id?: string;
  folio: string;
  titulo: string;
  domicilio?: string;
  fecha: string;
  valida_hasta?: string;
  estado: "borrador" | "enviada" | "autorizada" | "rechazada";
  items: CotizacionItem[];
  notas?: string;
  clausula: string;
};

export type WorkshopState = {
  clientes: Cliente[];
  motocicletas: Motocicleta[];
  ordenes: OrdenTrabajo[];
  evidencias: Evidencia[];
  movimientos: MovimientoOrden[];
  cotizaciones: Cotizacion[];
};
