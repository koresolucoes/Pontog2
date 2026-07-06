import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import toast from 'react-hot-toast';

export const VenueClaimsView: React.FC = () => {
    const [claims, setClaims] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const token = useAdminStore((state) => state.getToken());

    const fetchClaims = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/venue-claims', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao buscar reivindicações');
            }
            
            const data = await response.json();
            setClaims(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClaims();
    }, [token]);

    const handleAction = async (claimId: string, action: 'approve' | 'reject') => {
        const confirmStr = action === 'approve' ? 'Aprovar esta reivindicação e transferir propriedade?' : 'Rejeitar esta reivindicação?';
        if (!window.confirm(confirmStr)) return;

        try {
            const response = await fetch('/api/admin/venue-claims', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ claimId, action, reason: 'Ação via painel' })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao processar reivindicação');
            }

            toast.success(action === 'approve' ? 'Reivindicação aprovada com sucesso!' : 'Reivindicação rejeitada.');
            fetchClaims();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (loading) return <div className="text-center text-slate-400">Carregando reivindicações...</div>;
    if (error) return <div className="text-center text-red-500">Erro: {error}</div>;

    const pendingClaims = claims.filter(c => c.status === 'pending');
    const pastClaims = claims.filter(c => c.status !== 'pending');

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 font-outfit text-white">Reivindicações de Locais</h1>
            
            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-bold mb-4 text-white">Pendentes ({pendingClaims.length})</h2>
                    {pendingClaims.length === 0 ? (
                        <p className="text-slate-400 bg-slate-800/30 p-4 rounded-xl border border-white/5">Nenhuma reivindicação pendente.</p>
                    ) : (
                        <div className="bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Usuário</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Local</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Prova/Comprovação</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Data</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {pendingClaims.map(claim => (
                                        <tr key={claim.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-white">{claim.users?.username}</div>
                                                <div className="text-xs text-gray-400">{claim.users?.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-white">{claim.venues?.name}</div>
                                                <div className="text-xs text-gray-400">{claim.venues?.address}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-300 line-clamp-3">{claim.message}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {new Date(claim.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button 
                                                    onClick={() => handleAction(claim.id, 'approve')}
                                                    className="text-green-400 hover:text-green-300 bg-green-400/10 px-3 py-1 rounded-md"
                                                >
                                                    Aprovar
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(claim.id, 'reject')}
                                                    className="text-red-400 hover:text-red-300 bg-red-400/10 px-3 py-1 rounded-md"
                                                >
                                                    Rejeitar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-white">Histórico</h2>
                    {pastClaims.length === 0 ? (
                        <p className="text-slate-400 bg-slate-800/30 p-4 rounded-xl border border-white/5">Nenhum histórico.</p>
                    ) : (
                        <div className="bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Usuário</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Local</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Data</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {pastClaims.map(claim => (
                                        <tr key={claim.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-white">{claim.users?.username}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-white">{claim.venues?.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    claim.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {claim.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {new Date(claim.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};
