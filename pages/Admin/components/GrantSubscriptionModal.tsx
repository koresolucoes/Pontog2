// pages/Admin/components/GrantSubscriptionModal.tsx
import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import { Profile } from '../../../types';
import toast from 'react-hot-toast';

interface Plan {
    id: string;
    plan_id: string;
    name: string;
}

interface GrantSubscriptionModalProps {
    user: Profile;
    onClose: () => void;
    onSuccess: () => void;
}

export const GrantSubscriptionModal: React.FC<GrantSubscriptionModalProps> = ({ user, onClose, onSuccess }) => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [loadingGrant, setLoadingGrant] = useState(false);
    const token = useAdminStore((state) => state.getToken());

    useEffect(() => {
        const fetchPlans = async () => {
            setLoadingPlans(true);
            try {
                const response = await fetch('/api/admin/plans', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Falha ao buscar planos');
                const data = await response.json();
                const activePlans = data.filter((p: any) => p.is_active);
                setPlans(activePlans);
                if (activePlans.length > 0) {
                    setSelectedPlanId(activePlans[0].plan_id);
                }
            } catch (err: any) {
                toast.error(err.message);
            } finally {
                setLoadingPlans(false);
            }
        };
        fetchPlans();
    }, [token]);

    const handleGrant = async () => {
        if (!selectedPlanId) {
            toast.error('Selecione um plano.');
            return;
        }
        setLoadingGrant(true);
        try {
            const response = await fetch('/api/admin/grant-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.id, planId: selectedPlanId })
            });
             if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao conceder assinatura');
            }
            toast.success(`Assinatura concedida para ${user.username}!`);
            onSuccess();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoadingGrant(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-2">Conceder Assinatura Plus</h2>
                <p className="text-gray-400 mb-4">Para o usuário: <span className="font-semibold text-white">{user.username}</span></p>
                
                {loadingPlans ? (
                    <p>Carregando planos...</p>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="plan" className="block text-sm font-medium text-gray-300">Selecione o Plano</label>
                             <select 
                                id="plan" 
                                value={selectedPlanId} 
                                onChange={(e) => setSelectedPlanId(e.target.value)}
                                className="mt-1 w-full bg-gray-700 p-2 rounded"
                            >
                                {plans.map(plan => (
                                    <option key={plan.id} value={plan.plan_id}>{plan.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-6">
                    <button type="button" onClick={onClose} className="bg-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-500 transition-colors">Cancelar</button>
                    <button 
                        onClick={handleGrant} 
                        disabled={loadingPlans || loadingGrant || !selectedPlanId} 
                        className="bg-pink-600 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-pink-700 transition-colors"
                    >
                        {loadingGrant ? 'Concedendo...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
