import React, { useCallback, useEffect, useState } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import { format } from 'date-fns';

interface ReportPerson {
    username: string;
}

interface Report {
    id: number;
    created_at: string;
    updated_at: string;
    reason: string;
    comments: string | null;
    status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
    reviewed_at: string | null;
    reviewed_by: string | null;
    resolution_notes: string | null;
    reporter: ReportPerson | ReportPerson[] | null;
    reported: ReportPerson | ReportPerson[] | null;
}

const usernameOf = (value: ReportPerson | ReportPerson[] | null) => {
    if (Array.isArray(value)) return value[0]?.username || 'Usuário';
    return value?.username || 'Usuário';
};

const STATUS_LABELS: Record<Report['status'], string> = {
    open: 'Aberta',
    reviewing: 'Em análise',
    resolved: 'Resolvida',
    dismissed: 'Descartada',
};

const STATUS_CLASSES: Record<Report['status'], string> = {
    open: 'bg-red-500/15 text-red-300 border-red-500/30',
    reviewing: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dismissed: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export const ReportsView: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const token = useAdminStore((state) => state.getToken());

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/reports', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Falha ao buscar denúncias');
            const data = await response.json();
            setReports(data);
        } catch (err: any) {
            setError(err.message || 'Falha ao carregar denúncias');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const updateStatus = async (report: Report, status: 'reviewing' | 'resolved' | 'dismissed') => {
        let resolutionNotes: string | null = null;
        if (status === 'resolved' || status === 'dismissed') {
            resolutionNotes = window.prompt(
                status === 'resolved'
                    ? 'Nota de resolução (opcional):'
                    : 'Motivo do descarte (opcional):',
                report.resolution_notes || '',
            );
            if (resolutionNotes === null) return;
        }

        setUpdatingId(report.id);
        setError(null);
        try {
            const response = await fetch('/api/admin/reports', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ reportId: report.id, status, resolutionNotes }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || 'Falha ao atualizar denúncia');
            setReports((current) => current.map((item) => item.id === report.id ? payload : item));
        } catch (err: any) {
            setError(err.message || 'Falha ao atualizar denúncia');
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) return <div className="text-center text-slate-300">Carregando denúncias...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Denúncias de Usuários</h1>
                <p className="text-sm text-slate-400 mt-1">Fila operacional de Trust & Safety com trilha de auditoria.</p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}

            <div className="bg-gray-800 rounded-xl shadow-md overflow-x-auto border border-white/5">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700/80">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Data</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Denunciado</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Denunciador</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Motivo</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Contexto</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {reports.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">Nenhuma denúncia na fila.</td>
                            </tr>
                        )}
                        {reports.map((report) => {
                            const busy = updatingId === report.id;
                            return (
                                <tr key={report.id} className="align-top">
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-300">{format(new Date(report.created_at), 'dd/MM/yyyy HH:mm')}</td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-white">@{usernameOf(report.reported)}</td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-300">@{usernameOf(report.reporter)}</td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-300">{report.reason}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_CLASSES[report.status]}`}>
                                            {STATUS_LABELS[report.status]}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-400 max-w-sm">
                                        <p className="whitespace-pre-wrap">{report.comments || 'Sem comentário adicional.'}</p>
                                        {report.resolution_notes && (
                                            <p className="mt-2 text-xs text-slate-500">Resolução: {report.resolution_notes}</p>
                                        )}
                                        {report.reviewed_by && (
                                            <p className="mt-1 text-[11px] text-slate-600">Última revisão: {report.reviewed_by}</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 min-w-[240px]">
                                        <div className="flex flex-wrap gap-2">
                                            {report.status !== 'reviewing' && (
                                                <button disabled={busy} onClick={() => updateStatus(report, 'reviewing')} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 disabled:opacity-40">
                                                    Em análise
                                                </button>
                                            )}
                                            {report.status !== 'resolved' && (
                                                <button disabled={busy} onClick={() => updateStatus(report, 'resolved')} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 disabled:opacity-40">
                                                    Resolver
                                                </button>
                                            )}
                                            {report.status !== 'dismissed' && (
                                                <button disabled={busy} onClick={() => updateStatus(report, 'dismissed')} className="rounded-lg border border-slate-500/30 bg-slate-500/10 px-3 py-1.5 text-xs font-bold text-slate-300 disabled:opacity-40">
                                                    Descartar
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
