// src/hooks/useOrderApproval.ts
/**
 * Hook para aprobar o rechazar pedidos pendientes de revisión del dueño.
 * Llama a POST /orders/{id}/review con action: "approve" | "reject".
 */

import { useState } from "react";
import { fetchWithAuth, API_URL } from "@/lib/fetchWithAuth";

export type ApprovalAction = "approve" | "reject";

interface UseOrderApprovalReturn {
  loading: boolean;
  approveOrder: (orderId: string) => Promise<boolean>;
  rejectOrder: (orderId: string, reason?: string) => Promise<boolean>;
}

export function useOrderApproval(): UseOrderApprovalReturn {
  const [loading, setLoading] = useState(false);

  const reviewOrder = async (
    orderId: string,
    action: ApprovalAction,
    reason?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const body: Record<string, string> = { action };
      if (reason) body.reason = reason;

      const res = await fetchWithAuth(`${API_URL}/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[ORDER_APPROVAL] Error:", err);
        return false;
      }
      return true;
    } catch (e) {
      console.error("[ORDER_APPROVAL] Excepción:", e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    approveOrder: (orderId) => reviewOrder(orderId, "approve"),
    rejectOrder: (orderId, reason) => reviewOrder(orderId, "reject", reason),
  };
}
