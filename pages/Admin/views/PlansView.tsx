// pages/Admin/views/PlansView.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import toast from 'react-hot-toast';

interface Plan {
    id: string;
    plan_id: string;
    name: string;
    price: number;
    months_duration: number;
    is_active: boolean;
    is_popular: boolean;
}

const PlanFormModal: React.FC<{
    plan: Partial<Plan> | null;
    onClose: () => void;
    onSave: () => void;
}> = ({ plan, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Plan>>({});
    const [loading, setLoading] = useState(false);
    const token = useAdminStore((state) => state.getToken());
    const isEditing = !!plan?.id;

    useEffect(() => {
        setFormData(plan || { is_active: true, is_popular: false });
    }, [plan]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? (value === '' ? null : parseFloat(value)) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = isEditing ? `/api/admin/plans?id=${plan?.id}` : '/api/admin/plans';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao salvar o plano');
            }
            toast.success(`Plano ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
            onSave();
            onClose();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar Plano' : 'Novo Plano'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">Nome</label>
                        <input id="name" type="text" name="name" value={formData.name || ''} onChange={handleChange} placeholder="Ex: 1 Mês" className="mt-1 w-full bg-gray-700 p-2 rounded" required />
                    </div>
                     <div>
                        <label htmlFor="plan_id" className="block text-sm font-medium text-gray-300">ID do Plano</label>
                        <input id="plan_id" type="text" name="plan_id" value={formData.plan_id || ''} onChange={handleChange} placeholder="Ex: monthly" className="mt-1 w-full bg-gray-700 p-2 rounded" required disabled={isEditing} />
                        <p className="mt-1 text-xs text-gray-400">Identificador único. Não pode ser alterado após a criação.</p>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-300">Preço (R$)</label>
                            <input id="price" type="number" name="price" value={formData.price ?? ''} onChange={handleChange} placeholder="Ex: 29.90" step="0.01" className="mt-1 w-full bg-gray-700 p-2 rounded" required />
                        </div>
                        <div>
                            <label htmlFor="months_duration" className="block text-sm font-medium text-gray-300">Duração (Meses)</label>
                            <input id="months_duration" type="number" name="months_duration" value={formData.months_duration ?? ''} onChange={handleChange} placeholder="Ex: 1" className="mt-1 w-full bg-gray-700 p-2 rounded" required />
                        </div>
                    </div>
                    <div className="flex space-x-4 pt-2">
                        <label className="flex items-center gap-2 text-sm text-gray-200"><input type="checkbox" name="is_active" checked={formData.is_active || false} onChange={handleChange} /> Ativo</label>
                        <label className="flex items-center gap-2 text-sm text-gray-200"><input type="checkbox" name="is_popular" checked={formData.is_popular || false} onChange={handleChange} /> Popular</label>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-500 transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className="bg-pink-600 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-pink-700 transition-colors">{loading ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const PlansView: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
    const token = useAdminStore((state) => state.getToken());

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/plans', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao buscar planos');
            const data = await response.json();
            setPlans(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    if (loading) return <div className="text-center">Carregando planos...</div>;
    if (error) return <div className="text-center text-red-500">Erro: {error}</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Gerenciamento de Planos</h1>
                <button onClick={() => setEditingPlan({})} className="bg-pink-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-pink-700">
                    Novo Plano
                </button>
            </div>
            
            <div className="bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Preço</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Duração</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {plans.map(plan => (
                            <tr key={plan.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{plan.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{plan.months_duration} {plan.months_duration > 1 ? 'meses' : 'mês'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {plan.is_active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => setEditingPlan(plan)} className="text-pink-400 hover:text-pink-300">Editar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {editingPlan && <PlanFormModal plan={editingPlan} onClose={() => setEditingPlan(null)} onSave={fetchPlans} />}
        </div>
    );
};
