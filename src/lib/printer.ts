/**
 * printer.ts — Servicio de impresora térmica para WatBot Dashboard
 *
 * Soporta dos modos:
 *  1. Web Serial API (ESC/POS) → Chrome/Edge, USB directo, sin instalar nada
 *  2. CSS window.print()       → Fallback universal para cualquier impresora del SO
 *
 * Compatibilidad ESC/POS: SAT PCS Q22, Epson TM series, Star TSP, Bixolon, etc.
 */

// ─── Tipos ─────────────────────────────────────────────────────────────────

export interface PrinterConfig {
  mode: 'serial' | 'css';        // 'serial' = Web Serial API, 'css' = window.print()
  paperWidth: 58 | 80;           // mm — Q22 = 80mm
  copies: number;                // cuántas copias imprimir
  autoprint: boolean;            // imprimir automáticamente al aprobar
  businessName: string;          // nombre del negocio para el encabezado
  businessPhone: string;         // teléfono en el recibo
  footerText: string;            // texto al pie (ej: "¡Gracias por tu pedido!")
}

export interface PrintOrder {
  id: string;
  name: string;
  phone_number: string;
  address?: string;
  payment_method: string;
  total: number;
  products: { name: string; quantity: number; price?: number; notes?: string }[];
  created_at: string;
  status?: string;
}

// ─── Config por defecto ────────────────────────────────────────────────────

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  mode: 'serial',
  paperWidth: 80,
  copies: 2,
  autoprint: true,
  businessName: 'Mi Negocio',
  businessPhone: '',
  footerText: '¡Gracias por tu pedido! 🙏',
};

const STORAGE_KEY = 'watbot_printer_config';

export function loadPrinterConfig(): PrinterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(raw) };
  } catch (_) {}
  return { ...DEFAULT_PRINTER_CONFIG };
}

export function savePrinterConfig(config: PrinterConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// ─── ESC/POS Helpers ───────────────────────────────────────────────────────

const ESC = 0x1b;
const GS  = 0x1d;

function cmd(...bytes: number[]): Uint8Array {
  return new Uint8Array(bytes);
}

function text(str: string): Uint8Array {
  // Codificar a latin-1 para máxima compatibilidad con impresoras económicas
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    // Mapeo básico de caracteres especiales comunes en español
    buf[i] = c > 255 ? LATIN1_MAP[str[i]] ?? 0x3f : c;
  }
  return buf;
}

// Mapeo mínimo de caracteres especiales → latin-1
const LATIN1_MAP: Record<string, number> = {
  'á': 0xe1, 'é': 0xe9, 'í': 0xed, 'ó': 0xf3, 'ú': 0xfa,
  'Á': 0xc1, 'É': 0xc9, 'Í': 0xcd, 'Ó': 0xd3, 'Ú': 0xda,
  'ñ': 0xf1, 'Ñ': 0xd1, 'ü': 0xfc, 'Ü': 0xdc,
  '¿': 0xbf, '¡': 0xa1, '°': 0xb0,
};

const INIT          = cmd(ESC, 0x40);              // Inicializar impresora
const ALIGN_CENTER  = cmd(ESC, 0x61, 0x01);
const ALIGN_LEFT    = cmd(ESC, 0x61, 0x00);
const ALIGN_RIGHT   = cmd(ESC, 0x61, 0x02);
const BOLD_ON       = cmd(ESC, 0x45, 0x01);
const BOLD_OFF      = cmd(ESC, 0x45, 0x00);
const DOUBLE_HEIGHT = cmd(ESC, 0x21, 0x10);       // Texto doble alto
const NORMAL_SIZE   = cmd(ESC, 0x21, 0x00);
const LINE_FEED     = cmd(0x0a);
const CUT_PAPER     = cmd(GS, 0x56, 0x42, 0x00);  // Corte parcial

function separator(width: number, char = '-'): Uint8Array {
  const cols = width === 80 ? 42 : 32;
  return text(char.repeat(cols) + '\n');
}

function padLine(left: string, right: string, width: number): string {
  const cols = width === 80 ? 42 : 32;
  const space = Math.max(1, cols - left.length - right.length);
  return left + ' '.repeat(space) + right + '\n';
}

// ─── Generador de bytes ESC/POS ────────────────────────────────────────────

export function buildEscPosReceipt(order: PrintOrder, config: PrinterConfig, copyLabel: string): Uint8Array {
  const chunks: Uint8Array[] = [];
  const w = config.paperWidth;

  const add = (...parts: Uint8Array[]) => chunks.push(...parts);

  // Inicializar
  add(INIT, LINE_FEED);

  // ── Encabezado ──
  add(ALIGN_CENTER, BOLD_ON, DOUBLE_HEIGHT);
  add(text(config.businessName + '\n'));
  add(NORMAL_SIZE, BOLD_OFF);
  if (config.businessPhone) add(text(config.businessPhone + '\n'));
  add(LINE_FEED);

  // ── Etiqueta de copia ──
  add(BOLD_ON);
  add(text(copyLabel + '\n'));
  add(BOLD_OFF);
  add(separator(w, '='));

  // ── Datos del pedido ──
  add(ALIGN_LEFT);
  const date = new Date(order.created_at).toLocaleString('es-CO', {
    dateStyle: 'short', timeStyle: 'short'
  });
  add(text(`Pedido #${order.id.slice(-6).toUpperCase()}\n`));
  add(text(`Fecha : ${date}\n`));
  add(separator(w));

  // ── Cliente ──
  add(BOLD_ON, text('CLIENTE\n'), BOLD_OFF);
  add(text(`${order.name}\n`));
  add(text(`Tel: ${order.phone_number}\n`));
  if (order.address) add(text(`Dir: ${order.address}\n`));
  add(separator(w));

  // ── Productos ──
  add(BOLD_ON, text('PRODUCTOS\n'), BOLD_OFF);
  for (const p of order.products) {
    const qty = `x${p.quantity}`;
    add(text(padLine(p.name.slice(0, w === 80 ? 30 : 22), qty, w)));
    if (p.notes) add(text(`  -> ${p.notes}\n`));
  }
  add(separator(w));

  // ── Total ──
  const totalStr = `$${order.total.toLocaleString('es-CO')}`;
  add(BOLD_ON, ALIGN_RIGHT, DOUBLE_HEIGHT);
  add(text(`TOTAL: ${totalStr}\n`));
  add(NORMAL_SIZE, BOLD_OFF, ALIGN_LEFT);

  // ── Pago ──
  add(text(`Pago: ${order.payment_method}\n`));
  add(separator(w));

  // ── Pie ──
  add(ALIGN_CENTER);
  add(text(config.footerText + '\n'));
  add(LINE_FEED, LINE_FEED, LINE_FEED);
  add(CUT_PAPER);

  // Concatenar todos los chunks en un solo Uint8Array
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// ─── Web Serial API ────────────────────────────────────────────────────────
// Nota: SerialPort no está en las definiciones estándar de TypeScript.
// Usamos `any` para evitar errores de compilación con Vercel/Next.js.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _port: any = null;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Verifica si hay un puerto serial abierto y funcional.
 */
export function isSerialConnected(): boolean {
  try {
    return _port !== null && _port.readable !== null && !_port.readable.locked;
  } catch (_e) {
    _port = null;
    return false;
  }
}

/**
 * AutoConnect — intenta reconectar a un puerto ya autorizado sin mostrar diálogo.
 * Usa navigator.serial.getPorts() que solo devuelve puertos que el usuario ya aprobó.
 * Llama esto al iniciar la app para que la impresora ya esté lista cuando se apruebe un pedido.
 * Retorna { ok: true } si logró conectar, { ok: false } si no hay puerto autorizado aún.
 */
export async function autoConnectSerialPrinter(): Promise<{ ok: boolean; error?: string }> {
  if (!isWebSerialSupported()) {
    return { ok: false, error: 'Web Serial no disponible.' };
  }
  if (isSerialConnected()) {
    console.log('[PRINTER] autoConnect: ya conectado, reutilizando puerto');
    return { ok: true }; // Ya conectado
  }
  try {
    // getPorts() devuelve los puertos previamente autorizados — SIN DIÁLOGO
    const ports = await (navigator as any).serial.getPorts();
    console.log('[PRINTER] autoConnect: getPorts() retornó', ports.length, 'puerto(s)');
    if (!ports || ports.length === 0) {
      return { ok: false, error: 'No hay impresora autorizada. Ve a Configuración y haz clic en "Conectar impresora USB".' };
    }
    _port = ports[0];
    // Si ya está abierto, lo reutilizamos
    if (_port.readable) {
      console.log('[PRINTER] autoConnect: puerto ya abierto, reutilizando');
      return { ok: true };
    }
    console.log('[PRINTER] autoConnect: abriendo puerto a 115200 baud...');
    await _port.open({ baudRate: 115200 });
    console.log('[PRINTER] autoConnect: puerto abierto exitosamente');
    return { ok: true };
  } catch (e: any) {
    console.warn('[PRINTER] autoConnect error:', e?.name, e?.message);
    // "InvalidStateError" = puerto ya abierto (mismo proceso u otra pestaña)
    if (e?.name === 'InvalidStateError') {
      console.log('[PRINTER] autoConnect: puerto ya estaba abierto (InvalidStateError), considerándolo conectado');
      return { ok: true };
    }
    _port = null;
    return { ok: false, error: e?.message || 'No se pudo reconectar la impresora.' };
  }
}

/**
 * Conecta al puerto serial mostrando el diálogo de selección del sistema.
 * Solo llamar esto cuando el usuario explícitamente quiere elegir una impresora
 * (ej: botón "Conectar impresora" en Configuración).
 */
export async function connectSerialPrinter(): Promise<{ ok: boolean; error?: string }> {
  if (!isWebSerialSupported()) {
    return { ok: false, error: 'Web Serial API no está disponible. Usa Chrome o Edge.' };
  }
  // Si ya hay un puerto abierto, no volver a pedir — usarlo directamente
  if (isSerialConnected()) {
    console.log('[PRINTER] connect: ya hay un puerto abierto, reutilizándolo');
    return { ok: true };
  }
  try {
    console.log('[PRINTER] connect: solicitando puerto via requestPort()...');
    _port = await (navigator as any).serial.requestPort();
    console.log('[PRINTER] connect: usuario seleccionó puerto, abriendo...');
    await _port.open({ baudRate: 115200 });
    console.log('[PRINTER] connect: puerto abierto en 115200 baud');
    return { ok: true };
  } catch (e: any) {
    console.warn('[PRINTER] connect error:', e?.name, e?.message);
    if (e?.name === 'NotFoundError') {
      _port = null;
      return { ok: false, error: 'No seleccionaste ningún puerto. Si no aparece ninguno, instala el driver CH340.' };
    }
    if (e?.name === 'InvalidStateError') {
      // El puerto ya estaba abierto desde una sesión anterior
      console.log('[PRINTER] connect: puerto ya estaba abierto, reutilizando');
      return { ok: true };
    }
    _port = null;
    return { ok: false, error: e?.message || 'Error al conectar la impresora.' };
  }
}

/**
 * Retorna información de diagnóstico sobre la impresora.
 * Útil para mostrar en la UI y debuggear problemas.
 */
export async function getPrinterDiagnosticInfo(): Promise<{
  webSerialSupported: boolean;
  authorizedPorts: number;
  isConnected: boolean;
  portInfo?: string;
}> {
  const supported = isWebSerialSupported();
  if (!supported) {
    return { webSerialSupported: false, authorizedPorts: 0, isConnected: false };
  }
  try {
    const ports = await (navigator as any).serial.getPorts();
    const connected = isSerialConnected();
    let portInfo: string | undefined;
    if (ports.length > 0) {
      try {
        const info = await ports[0].getInfo();
        portInfo = `USB ${info.usbVendorId?.toString(16) ?? '?'}:${info.usbProductId?.toString(16) ?? '?'}`;
      } catch (_) {}
    }
    return {
      webSerialSupported: true,
      authorizedPorts: ports.length,
      isConnected: connected,
      portInfo,
    };
  } catch (e) {
    return { webSerialSupported: true, authorizedPorts: 0, isConnected: false };
  }
}

export function disconnectSerialPrinter(): void {
  if (_port) {
    try { _port.close(); } catch (_e) {}
    _port = null;
  }
}

async function writeToSerial(data: Uint8Array): Promise<void> {
  if (!_port || !_port.writable) throw new Error('Puerto serial no conectado.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writer: any = _port.writable.getWriter();
  try {
    await writer.write(data);
  } finally {
    writer.releaseLock();
  }
}

// ─── CSS / window.print() Fallback ────────────────────────────────────────

function buildHtmlReceipt(order: PrintOrder, config: PrinterConfig, copyLabel: string): string {
  const date = new Date(order.created_at).toLocaleString('es-CO', {
    dateStyle: 'short', timeStyle: 'short',
  });
  const orderId = order.id.slice(-6).toUpperCase();
  const totalFmt = `$${order.total.toLocaleString('es-CO')}`;
  const productRows = order.products.map(p => `
    <tr>
      <td style="padding:5px 0;font-size:13px;word-break:break-word;vertical-align:top;">
        🛒 <strong>${p.name}</strong>
        ${p.notes ? `<br/><span style="font-size:11px;color:#666;padding-left:20px">→ ${p.notes}</span>` : ''}
      </td>
      <td style="text-align:right;padding:5px 0 5px 10px;font-size:13px;white-space:nowrap;vertical-align:top;">
        <span style="background:#e5e7eb;border:1px solid #d1d5db;padding:2px 8px;border-radius:6px;font-weight:900">× ${p.quantity}</span>
      </td>
    </tr>
  `).join('');

  return `
    <div class="ticket-container" style="font-family:Arial,sans-serif;padding:0 8px 8px 0;font-size:12px;color:#000">

      <!-- ENCABEZADO -->
      <div style="text-align:center;padding:8px 0 6px;border-bottom:2px solid #111">
        <div style="font-size:16px;font-weight:900;letter-spacing:-0.5px">${config.businessName}</div>
        ${config.businessPhone ? `<div style="font-size:11px;color:#555;margin-top:2px">${config.businessPhone}</div>` : ''}
        <div style="margin-top:6px;font-size:11px;font-weight:900;letter-spacing:2px;color:#fff;background:#111;padding:3px 10px;border-radius:20px;display:inline-block">${copyLabel}</div>
      </div>

      <!-- PEDIDO -->
      <div style="padding:6px 0;border-bottom:1px dashed #bbb">
        <div style="font-size:11px;font-weight:900;color:#666;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">Pedido</div>
        <div style="font-size:13px;font-weight:bold">#${orderId}</div>
        <div style="font-size:11px;color:#555">${date}</div>
      </div>

      <!-- CLIENTE -->
      <div style="padding:6px 0;border-bottom:1px dashed #bbb">
        <div style="font-size:11px;font-weight:900;color:#666;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Datos del Cliente</div>
        <div style="font-size:15px;font-weight:900">${order.name}</div>
        <div style="font-size:12px;margin-top:2px">📞 ${order.phone_number}</div>
      </div>

      <!-- DIRECCIÓN -->
      ${order.address ? `
      <div style="padding:6px 0;border-bottom:1px dashed #bbb">
        <div style="font-size:11px;font-weight:900;color:#666;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Dirección y Entrega</div>
        <div style="font-size:12px;font-weight:bold;white-space:pre-wrap">${order.address}</div>
      </div>
      ` : ''}

      <!-- PRODUCTOS -->
      <div style="padding:6px 0;border-bottom:1px dashed #bbb">
        <div style="font-size:11px;font-weight:900;color:#666;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Productos</div>
        <table style="width:100%;border-collapse:collapse">
          ${productRows}
        </table>
      </div>

      <!-- TOTAL -->
      <div style="padding:8px 0;border-bottom:1px dashed #bbb">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:11px;font-weight:900;color:#666;letter-spacing:1px;text-transform:uppercase">Método de Pago</div>
            <div style="font-size:13px;font-weight:900">${order.payment_method}</div>
          </div>
          <div style="background:#000;padding:6px 10px;border-radius:6px;text-align:right">
            <div style="font-size:10px;color:#ddd;font-weight:bold;letter-spacing:1px">TOTAL</div>
            <div style="font-size:18px;font-weight:900;color:#fff">${totalFmt}</div>
          </div>
        </div>
      </div>

      <!-- PIE -->
      <div style="text-align:center;padding:8px 0 4px;font-size:11px;color:#555">
        ${config.footerText}
      </div>

    </div>
  `;
}

function printCssReceipt(order: PrintOrder, config: PrinterConfig, copies: number): void {
  const copyLabels = ['🍴 COCINA', '🧾 CLIENTE', '📋 ADMIN'];
  const receipts = Array.from({ length: copies }, (_, i) =>
    buildHtmlReceipt(order, config, copyLabels[i] ?? `📄 COPIA ${i + 1}`)
  ).join('<div style="page-break-after:always"></div>');

  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>Recibo</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: #fff; }
          .ticket-container {
            width: 100%;
            max-width: ${config.paperWidth === 80 ? '250px' : '170px'};
            margin: 0; /* Alinear a la izquierda para impresoras térmicas */
          }
          @media print {
            @page { margin: 0; }
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${receipts}
        <script>
          window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); }
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

// ─── Función principal de impresión ────────────────────────────────────────

const COPY_LABELS = ['🍴 COCINA', '🧾 CLIENTE', '📋 ADMIN'];

/**
 * printOrder — Punto de entrada principal.
 * Imprime el pedido según la configuración guardada.
 *
 * Comportamiento:
 *  - Modo 'css': abre window.print() siempre.
 *  - Modo 'serial': intenta autoconectar (sin diálogo) si no hay conexión.
 *    Si no hay puerto autorizado → retorna { ok: false } SIN fallback CSS.
 *    El caller decide si mostrar un mensaje de error al usuario.
 *
 * Retorna { ok, error } para que el caller pueda mostrar feedback.
 */
export async function printOrder(
  order: PrintOrder,
  configOverride?: Partial<PrinterConfig>
): Promise<{ ok: boolean; error?: string }> {
  const config = { ...loadPrinterConfig(), ...configOverride };

  // ── Modo CSS: fallback universal, siempre disponible ──────────────────────
  if (config.mode === 'css') {
    printCssReceipt(order, config, config.copies);
    return { ok: true };
  }

  // ── Modo Serial (ESC/POS) ─────────────────────────────────────────────────
  if (!isWebSerialSupported()) {
    return {
      ok: false,
      error: 'Tu navegador no soporta impresión directa. Usa Chrome o Edge, o cambia el modo a CSS en Configuración.',
    };
  }

  // Si no hay conexión activa, intentar autoconectar SIN mostrar diálogo
  if (!isSerialConnected()) {
    const auto = await autoConnectSerialPrinter();
    if (!auto.ok) {
      // No hay puerto autorizado → el usuario debe ir a Configuración > Impresora
      return {
        ok: false,
        error: auto.error || 'Impresora no conectada. Ve a Configuración > Impresora y conecta primero.',
      };
    }
  }

  // Imprimir todas las copias
  try {
    for (let i = 0; i < config.copies; i++) {
      const label = COPY_LABELS[i] ?? `📄 COPIA ${i + 1}`;
      const bytes = buildEscPosReceipt(order, config, label);
      await writeToSerial(bytes);
      // Pequeña pausa entre copias para que la impresora no se sature
      if (i < config.copies - 1) await new Promise(r => setTimeout(r, 500));
    }
    return { ok: true };
  } catch (e: any) {
    // Error al escribir — la impresora puede haberse desconectado
    _port = null; // Marcar como desconectado para que el próximo intento re-autoconnecte
    console.error('[PRINTER] Error ESC/POS:', e);
    return { ok: false, error: `Error al imprimir: ${e?.message || 'revisa la conexión USB.'}` };
  }
}
