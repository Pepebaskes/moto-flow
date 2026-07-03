type NotificationRow = {
  id: string;
  telefono: string;
  mensaje: string;
  estado: string;
  proveedor: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length === 10 ? `52${digits}` : digits;
  return `whatsapp:+${withCountry}`;
}

function splitTemplateVariables(message: string) {
  const [greeting = "", ...rest] = message.split("\n");
  return {
    "1": greeting.replace(/^Hola\s+/i, "").replace(/,.*$/, "").trim() || "cliente",
    "2": rest.join(" ").replace(/\s+/g, " ").slice(0, 450) || message.slice(0, 450),
  };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en la Edge Function.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : text || "Error consultando Supabase.");
  }

  return data;
}

async function updateNotification(id: string, payload: Record<string, unknown>) {
  const encodedId = encodeURIComponent(id);
  const rows = await supabaseRequest(`notificaciones_cliente?id=eq.${encodedId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function sendWithTwilio(notification: NotificationRow) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_WHATSAPP_FROM");
  const contentSid = Deno.env.get("TWILIO_CONTENT_SID");

  if (!accountSid || !authToken || !from) {
    throw new Error("Faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_WHATSAPP_FROM.");
  }

  const params = new URLSearchParams({
    From: from,
    To: normalizeWhatsAppNumber(notification.telefono),
  });

  if (contentSid) {
    params.set("ContentSid", contentSid);
    params.set("ContentVariables", JSON.stringify(splitTemplateVariables(notification.mensaje)));
  } else {
    params.set("Body", notification.mensaje);
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: params,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Twilio no pudo enviar el WhatsApp.");
  }

  return data as { sid?: string };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Metodo no permitido." }, 405);

  let notificationId = "";

  try {
    const body = await request.json();
    notificationId = String(body.notification_id || "");

    if (!notificationId) {
      return jsonResponse({ ok: false, error: "notification_id es requerido." }, 400);
    }

    const encodedId = encodeURIComponent(notificationId);
    const rows = await supabaseRequest(`notificaciones_cliente?id=eq.${encodedId}&select=id,telefono,mensaje,estado,proveedor&limit=1`);
    const notification = Array.isArray(rows) ? rows[0] as NotificationRow | undefined : undefined;

    if (!notification) {
      return jsonResponse({ ok: false, error: "Notificacion no encontrada." }, 404);
    }

    if (notification.estado === "enviado") {
      return jsonResponse({ ok: true, estado: "enviado", skipped: true });
    }

    const provider = Deno.env.get("WHATSAPP_PROVIDER") || notification.proveedor || "twilio";

    if (provider !== "twilio") {
      throw new Error(`Proveedor WhatsApp no soportado todavia: ${provider}`);
    }

    const sent = await sendWithTwilio(notification);
    const updated = await updateNotification(notification.id, {
      estado: "enviado",
      proveedor: "twilio",
      proveedor_message_id: sent.sid ?? null,
      error: null,
      enviado_at: new Date().toISOString(),
    });

    return jsonResponse({ ok: true, estado: "enviado", proveedor_message_id: sent.sid, notification: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido enviando WhatsApp.";

    if (notificationId) {
      try {
        await updateNotification(notificationId, {
          estado: "error",
          proveedor: Deno.env.get("WHATSAPP_PROVIDER") || "twilio",
          error: message,
        });
      } catch (_updateError) {
        // Se evita ocultar el error original de envio.
      }
    }

    return jsonResponse({ ok: false, error: message }, 500);
  }
});
