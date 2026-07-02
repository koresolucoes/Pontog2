// pages/Admin/views/PaymentsView.tsx
import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import { format } from 'date-fns';

interface Payment {
    id: number;
    mercadopago_id: string;
    user_id: string;
    plan_id: string;
    amount: number;
    status: string;
    created_at: string;
    profiles: {
        username: string;
    };
}

export const PaymentsView: React.FC = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const token = useAdminStore((state) => state.getToken());

    useEffect(() => {
        const fetchPayments = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/admin/payments', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Falha ao buscar pagamentos');
                const data = await response.json();
                setPayments(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPayments();
    }, [token]);

    const getStatusChip = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'rejected':
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };


    if (loading) return <div className="text-center">Carregando pagamentos...</div>;
    if (error) return <div className="text-center text-red-500">Erro: {error}</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Histórico de Pagamentos</h1>
            
            <div className="bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Data</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Usuário</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Plano</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Valor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {payments.map(payment => (
                            <tr key={payment.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{payment.profiles.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{payment.plan_id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusChip(payment.status)}`}>
                                        {payment.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
