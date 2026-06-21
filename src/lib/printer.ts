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

let _port: SerialPort | null = null;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Conecta al puerto serial. Abre el diálogo de selección si no hay uno guardado.
 * Guarda el puerto para reutilizarlo en la misma sesión.
 */
export async function connectSerialPrinter(): Promise<{ ok: boolean; error?: string }> {
  if (!isWebSerialSupported()) {
    return { ok: false, error: 'Web Serial API no está disponible. Usa Chrome o Edge.' };
  }
  try {
    _port = await (navigator as any).serial.requestPort();
    await _port!.open({ baudRate: 9600 });
    return { ok: true };
  } catch (e: any) {
    if (e?.name === 'NotFoundError') return { ok: false, error: 'No seleccionaste ningún puerto.' };
    return { ok: false, error: e?.message || 'Error al conectar la impresora.' };
  }
}

export function disconnectSerialPrinter(): void {
  if (_port) {
    try { _port.close(); } catch (_) {}
    _port = null;
  }
}

export function isSerialConnected(): boolean {
  return _port !== null && _port.readable !== null;
}

async function writeToSerial(data: Uint8Array): Promise<void> {
  if (!_port || !_port.writable) throw new Error('Puerto serial no conectado.');
  const writer = _port.writable.getWriter();
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
  const paperW = config.paperWidth === 80 ? '280px' : '200px';

  const productRows = order.products.map(p => `
    <tr>
      <td style="padding:5px 0;font-size:13px">
        🛒 <strong>${p.name}</strong>
        ${p.notes ? `<br/><span style="font-size:11px;color:#666;padding-left:20px">→ ${p.notes}</span>` : ''}
      </td>
      <td style="text-align:right;padding:5px 0;font-size:13px">
        <span style="background:#e5e7eb;border:1px solid #d1d5db;padding:2px 8px;border-radius:6px;font-weight:900">× ${p.quantity}</span>
      </td>
    </tr>
  `).join('');

  return `
    <div style="font-family:Arial,sans-serif;width:${paperW};margin:0 auto;padding:8px;font-size:12px;color:#111">

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
          <div style="background:#111;padding:6px 12px;border-radius:8px;text-align:right">
            <div style="font-size:10px;color:#9ca3af;font-weight:bold;letter-spacing:1px">TOTAL</div>
            <div style="font-size:20px;font-weight:900;color:#4ade80">${totalFmt}</div>
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
          body { margin: 0; padding: 8px; }
          @media print {
            body { margin: 0; padding: 0; }
            @page { margin: 4mm; size: ${config.paperWidth}mm auto; }
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

const COPY_LABELS = ['🍴 COCINA', '🧾 CLIENTE'];

/**
 * printOrder — Punto de entrada principal.
 * Imprime el pedido según la configuración guardada.
 * Retorna { ok, error } para que el caller pueda mostrar feedback.
 */
export async function printOrder(
  order: PrintOrder,
  configOverride?: Partial<PrinterConfig>
): Promise<{ ok: boolean; error?: string }> {
  const config = { ...loadPrinterConfig(), ...configOverride };

  if (config.mode === 'css') {
    // Modo CSS: simple, universal, no requiere permisos
    printCssReceipt(order, config, config.copies);
    return { ok: true };
  }

  // Modo Serial: ESC/POS
  if (!isWebSerialSupported()) {
    // Fallback automático a CSS
    printCssReceipt(order, config, config.copies);
    return { ok: true, error: 'Web Serial no disponible — imprimiendo con modo CSS.' };
  }

  if (!isSerialConnected()) {
    const conn = await connectSerialPrinter();
    if (!conn.ok) {
      // Si el usuario canceló la conexión, intentar CSS como fallback
      printCssReceipt(order, config, config.copies);
      return { ok: true, error: `Sin conexión serial — imprimiendo con CSS. (${conn.error})` };
    }
  }

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
    // Si falla el serial, fallback a CSS
    console.error('[PRINTER] Error ESC/POS, fallback a CSS:', e);
    printCssReceipt(order, config, config.copies);
    return { ok: true, error: 'Error serial — imprimiendo con CSS.' };
  }
}
