// pages/Admin/views/ReportsView.tsx
import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import { format } from 'date-fns';

interface Report {
    id: number;
    created_at: string;
    reason: string;
    comments: string | null;
    reporter: { username: string };
    reported: { username: string };
}

export const ReportsView: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const token = useAdminStore((state) => state.getToken());

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/admin/reports', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Falha ao buscar denúncias');
                const data = await response.json();
                setReports(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [token]);

    if (loading) return <div className="text-center">Carregando denúncias...</div>;
    if (error) return <div className="text-center text-red-500">Erro: {error}</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Denúncias de Usuários</h1>
            
            <div className="bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Data</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Denunciado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Denunciador</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Motivo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Comentários</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {reports.map(report => (
                            <tr key={report.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{format(new Date(report.created_at), 'dd/MM/yyyy HH:mm')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{report.reported.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{report.reporter.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{report.reason}</td>
                                <td className="px-6 py-4 whitespace-normal text-sm text-gray-400 max-w-sm">{report.comments || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
