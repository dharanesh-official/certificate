"use client";

import { useState, useEffect } from "react";
import {
  ScrollText,
  Search,
  Filter,
  Shield,
  Loader2,
  Calendar,
  User,
  Activity,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  admin_id?: string | null;
  admin_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entityType", entityFilter);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  const getActionBadge = (action: string) => {
    if (action.includes("REVOKE") || action.includes("DELETE")) {
      return "bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]";
    }
    if (action.includes("CREATE") || action.includes("IMPORT") || action.includes("REISSUE")) {
      return "bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]";
    }
    if (action.includes("LOGIN")) {
      return "bg-[#FFF9C4] text-[#7F5800] border-[#FBC02D]";
    }
    return "bg-[#F2F1E4] text-[#57534E] border-[#D5D2C4]";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">
          Institutional Audit Trail
        </h1>
        <p className="text-xs text-[#57534E]">
          Immutable chronological ledger tracking all administrative actions, credential issuance, template revisions, and certificate revocations.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#57534E] font-medium">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="ADMIN_LOGIN">ADMIN_LOGIN</option>
            <option value="EVENT_CREATED">EVENT_CREATED</option>
            <option value="EVENT_UPDATED">EVENT_UPDATED</option>
            <option value="PARTICIPANT_ADDED">PARTICIPANT_ADDED</option>
            <option value="PARTICIPANTS_BULK_IMPORTED">PARTICIPANTS_BULK_IMPORTED</option>
            <option value="TEMPLATE_UPDATED">TEMPLATE_UPDATED</option>
            <option value="TEMPLATE_VERSION_INCREMENTED">TEMPLATE_VERSION_INCREMENTED</option>
            <option value="CERTIFICATE_REVOKED">CERTIFICATE_REVOKED</option>
            <option value="CERTIFICATE_REISSUED">CERTIFICATE_REISSUED</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#57534E] font-medium">Entity:</span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
          >
            <option value="">All Entities</option>
            <option value="Admin">Admin</option>
            <option value="Event">Event</option>
            <option value="Participant">Participant</option>
            <option value="Certificate">Certificate</option>
            <option value="CertificateTemplate">CertificateTemplate</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-[#E5E3D8] bg-white shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#57534E] flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#C62828]" />
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#8C8880] space-y-2">
            <ScrollText className="h-8 w-8 mx-auto text-[#D5D2C4]" />
            <p className="font-semibold text-[#1C1917]">No audit records found</p>
            <p>Admin actions will automatically record here with timestamp and IP origin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] border-b border-[#E5E3D8] text-[#8C8880] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Entity</th>
                  <th className="px-5 py-3.5">Administrator</th>
                  <th className="px-5 py-3.5">Details</th>
                  <th className="px-5 py-3.5">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3D8]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FBFBF9] transition">
                    <td className="px-5 py-3.5 whitespace-nowrap text-[#57534E] font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-medium text-[#1C1917]">
                      {log.entity_type}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-[#57534E]">
                      {log.admin_email || "System"}
                    </td>
                    <td className="px-5 py-3.5 text-[#57534E] max-w-sm truncate" title={log.details || ""}>
                      {log.details || "—"}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-[11px] text-[#8C8880]">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
