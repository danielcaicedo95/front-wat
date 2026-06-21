/**
 * usePrinter.ts — Hook React para el servicio de impresora térmica.
 *
 * Expone:
 *  - config, saveConfig  → leer/escribir configuración
 *  - print(order)        → imprimir un pedido
 *  - testPrint()         → imprimir una hoja de prueba
 *  - connect()           → conectar impresora serial manualmente
 *  - disconnect()        → desconectar
 *  - isConnected         → estado de la conexión serial
 *  - printing            → true mientras se imprime
 *  - lastResult          → resultado de la última impresión
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PrinterConfig,
  PrintOrder,
  DEFAULT_PRINTER_CONFIG,
  loadPrinterConfig,
  savePrinterConfig,
  printOrder,
  connectSerialPrinter,
  disconnectSerialPrinter,
  isSerialConnected,
  isWebSerialSupported,
} from '@/lib/printer';

export interface PrintResult {
  ok: boolean;
  error?: string;
}

export function usePrinter() {
  const [config, setConfigState] = useState<PrinterConfig>(DEFAULT_PRINTER_CONFIG);
  const [printing, setPrinting] = useState(false);
  const [lastResult, setLastResult] = useState<PrintResult | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serialSupported] = useState(isWebSerialSupported());

  // Cargar config desde localStorage al montar
  useEffect(() => {
    setConfigState(loadPrinterConfig());
  }, []);

  // Sincronizar estado de conexión
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(isSerialConnected());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const saveConfig = useCallback((updates: Partial<PrinterConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfigState(newConfig);
    savePrinterConfig(newConfig);
  }, [config]);

  const connect = useCallback(async (): Promise<PrintResult> => {
    const result = await connectSerialPrinter();
    setIsConnected(isSerialConnected());
    return result;
  }, []);

  const disconnect = useCallback(() => {
    disconnectSerialPrinter();
    setIsConnected(false);
  }, []);

  const print = useCallback(async (order: PrintOrder): Promise<PrintResult> => {
    setPrinting(true);
    setLastResult(null);
    try {
      const result = await printOrder(order);
      setLastResult(result);
      setIsConnected(isSerialConnected());
      return result;
    } finally {
      setPrinting(false);
    }
  }, []);

  const testPrint = useCallback(async (): Promise<PrintResult> => {
    const testOrder: PrintOrder = {
      id: 'test-000001',
      name: 'Cliente de Prueba',
      phone_number: '+57 300 000 0000',
      address: 'Calle Falsa 123, Barrio Centro',
      payment_method: 'Efectivo',
      total: 45000,
      products: [
        { name: 'Producto de prueba A', quantity: 2 },
        { name: 'Producto de prueba B', quantity: 1 },
      ],
      created_at: new Date().toISOString(),
      status: 'pending',
    };
    return print(testOrder);
  }, [print]);

  return {
    config,
    saveConfig,
    print,
    testPrint,
    connect,
    disconnect,
    isConnected,
    serialSupported,
    printing,
    lastResult,
  };
}
