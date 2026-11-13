import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { toolConnections } from "@paperclipai/db";
import { isToolConnectionAttentionHealth } from "@paperclipai/shared";
import { isBrowserUseConnection } from "../browser-use-client.js";
import { toolAccessService } from "../tool-access.js";

export type RuntimeMcpDeliveryReason =
  | "deliverable"
  | "not_installed"
  | "not_in_profile"
  | "disabled"
  | "not_active"
  | "needs_attention"
  | "unsupported_transport";

export type RuntimeMcpConnectionDiagnostic = {
  connectionId: string;
  name: string;
  transport: string;
  enabled: boolean;
  status: string;
  healthStatus: string;
  installed: boolean;
  inProfile: boolean;
  allowedToolCount: number;
  reason: RuntimeMcpDeliveryReason;
};

export async function diagnoseRuntimeMcpDelivery(input: {
  db: Db;
  companyId: string;
  agentId: string;
}): Promise<{
  agentId: string;
  profileBound: boolean;
  deliverableCount: number;
  connections: RuntimeMcpConnectionDiagnostic[];
}> {
  const effective = await toolAccessService(input.db).getEffectiveToolAssignmentsForAgent(
    input.companyId,
    input.agentId,
  );
  const installedIds = new Set(effective.installedConnections.map((connection) => connection.id));
  const includedIds = new Set([
    ...effective.entries
      .filter((entry) => entry.effect === "include" && entry.connectionId)
      .map((entry) => entry.connectionId!),
    ...effective.allowedTools.map((tool) => tool.connectionId),
  ]);
  const ids = [...new Set([...installedIds, ...includedIds])];
  const rows = ids.length === 0
    ? []
    : await input.db
        .select()
        .from(toolConnections)
        .where(and(eq(toolConnections.companyId, input.companyId), inArray(toolConnections.id, ids)));
  const connections = rows
    .map((row): RuntimeMcpConnectionDiagnostic => {
      const installed = installedIds.has(row.id);
      const inProfile = includedIds.has(row.id);
      const supported =
        row.transport === "mcp_remote" ||
        row.transport === "local_stdio" ||
        isBrowserUseConnection(row);
      let reason: RuntimeMcpDeliveryReason = "deliverable";
      if (!installed) reason = "not_installed";
      else if (!inProfile) reason = "not_in_profile";
      else if (!row.enabled) reason = "disabled";
      else if (row.status !== "active") reason = "not_active";
      else if (row.credentialPolicy !== "per_user" && isToolConnectionAttentionHealth(row.healthStatus)) {
        reason = "needs_attention";
      } else if (!supported) reason = "unsupported_transport";
      return {
        connectionId: row.id,
        name: row.name,
        transport: row.transport,
        enabled: row.enabled,
        status: row.status,
        healthStatus: row.healthStatus,
        installed,
        inProfile,
        allowedToolCount: effective.allowedTools.filter((tool) => tool.connectionId === row.id).length,
        reason,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    agentId: input.agentId,
    profileBound: effective.bindings.length > 0,
    deliverableCount: connections.filter((connection) => connection.reason === "deliverable").length,
    connections,
  };
}
