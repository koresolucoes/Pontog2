// pages/Admin/views/AuditLogsView.tsx
import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import { format } from 'date-fns';

interface AuditLog {
    id: string;
    admin_email: string;
    admin_name: string;
    role: string;
    action: string;
    target_id: string;
    details: string;
    ip_address: string;
    created_at: string;
}

export const AuditLogsView: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterAction, setFilterAction] = useState('');
    const [filterSearch, setFilterSearch] = useState('');
    const token = useAdminStore((state) => state.getToken());

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/audit-logs', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Falha ao buscar logs de auditoria');
            }
            const data = await response.json();
            setLogs(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [token]);

    const getActionBadgeColor = (action: string) => {
        switch (action) {
            case 'LOGIN': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'LOGIN_FAILED': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'BAN_USER': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'SUSPEND_USER': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'GRANT_PLUS': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'REVOKE_PLUS': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            case 'CREATE_PLAN':
            case 'UPDATE_PLAN':
            case 'UPDATE_SETTINGS': 
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-slate-700/50 text-slate-300 border-white/5';
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-pink-600/20 text-pink-400 border-pink-500/30';
            case 'moderator': return 'bg-purple-600/20 text-purple-400 border-purple-500/30';
            case 'financial': return 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30';
            case 'support': return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
            default: return 'bg-slate-800 text-slate-400 border-transparent';
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesAction = filterAction === '' || log.action === filterAction;
        const matchesSearch = filterSearch === '' || 
            log.admin_name.toLowerCase().includes(filterSearch.toLowerCase()) ||
            log.admin_email.toLowerCase().includes(filterSearch.toLowerCase()) ||
            log.details.toLowerCase().includes(filterSearch.toLowerCase()) ||
            log.target_id.toLowerCase().includes(filterSearch.toLowerCase());
        return matchesAction && matchesSearch;
    });

    // Extract unique actions for filtering
    const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center font-bold">
            Erro: {error}
        </div>
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white font-outfit tracking-tight">Logs de Auditoria</h1>
                    <p className="text-slate-400 mt-1">Trilha de auditoria imutável das ações operacionais de administradores.</p>
                </div>
                <button 
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl font-bold text-sm transition-all self-start"
                >
                    <span className="material-symbols-rounded text-sm">refresh</span>
                    Atualizar Logs
                </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                    <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                    <input
                        type="text"
                        placeholder="Buscar por admin, detalhes, ID..."
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        className="w-full bg-slate-850 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all placeholder-slate-600"
                    />
                </div>
                
                <div className="relative">
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="w-full bg-slate-850 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all appearance-none"
                    >
                        <option value="">Filtrar por Ação (Todas)</option>
                        {uniqueActions.map(act => (
                            <option key={act} value={act}>{act}</option>
                        ))}
                    </select>
                    <span className="material-symbols-rounded absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">keyboard_arrow_down</span>
                </div>

                <div className="flex items-center justify-end text-xs text-slate-400 font-mono">
                    Registros filtrados: {filteredLogs.length} / {logs.length}
                </div>
            </div>

            {/* Logs Table / List */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                {filteredLogs.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-sm">
                        Nenhum registro de auditoria encontrado correspondente aos filtros atuais.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-slate-950/20 text-slate-400 text-xs uppercase tracking-wider font-bold">
                                    <th className="p-4">Data/Hora</th>
                                    <th className="p-4">Administrador</th>
                                    <th className="p-4">Ação</th>
                                    <th className="p-4">Detalhes</th>
                                    <th className="p-4">Alvo</th>
                                    <th className="p-4 text-right">Origem IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-white/[0.01] transition-all">
                                        <td className="p-4 whitespace-nowrap text-slate-400 text-xs font-mono">
                                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <p className="font-bold text-white text-xs">{log.admin_name}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono">{log.admin_email}</p>
                                                </div>
                                                <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest border rounded-full ${getRoleBadgeColor(log.role)}`}>
                                                    {log.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap font-mono text-xs">
                                            <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${getActionBadgeColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-300 max-w-xs break-words font-inter text-xs">
                                            {log.details}
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                                            {log.target_id}
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-right text-xs text-slate-500 font-mono">
                                            {log.ip_address}
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
};
