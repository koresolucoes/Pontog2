// pages/Admin/views/UsersView.tsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import { Profile } from '../../../types';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import toast from 'react-hot-toast';

// Action Dropdown component
const ActionDropdown: React.FC<{
    user: Profile;
    onAction: (action: string, duration?: number) => void;
}> = ({ user, onAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleActionClick = (action: string, duration?: number) => {
        onAction(action, duration);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined">more_vert</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-10">
                    <div className="py-1">
                        {user.subscription_tier === 'plus' ? (
                            <button onClick={() => handleActionClick('revoke-plus')} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">Revogar Plus</button>
                        ) : (
                            <button onClick={() => handleActionClick('grant-plus')} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">Conceder Plus</button>
                        )}
                        <hr className="border-gray-600 my-1"/>
                        {user.status === 'active' ? (
                            <>
                                <button onClick={() => handleActionClick('suspend', 1)} className="block w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-gray-600">Suspender (1 dia)</button>
                                <button onClick={() => handleActionClick('suspend', 7)} className="block w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-gray-600">Suspender (7 dias)</button>
                                <button onClick={() => handleActionClick('ban')} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-600">Banir</button>
                            </>
                        ) : (
                            <button onClick={() => handleActionClick('reactivate')} className="block w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-gray-600">Reativar Conta</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


export const UsersView: React.FC = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const token = useAdminStore((state) => state.getToken());
    
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 15;

    // State for confirmation modal
    const [confirmAction, setConfirmAction] = useState<{ user: Profile; action: string; duration?: number } | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao buscar usuários');
            }
            const data = await response.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const filteredUsers = useMemo(() => {
        return users.filter(user => 
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);
    
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const handleConfirm = async () => {
        if (!confirmAction) return;
        
        const toastId = toast.loading('Executando ação...');
        try {
            const response = await fetch('/api/admin/user-actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: confirmAction.user.id,
                    action: confirmAction.action,
                    duration_days: confirmAction.duration
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao executar ação');
            }
            const result = await response.json();
            toast.success(result.message, { id: toastId });
            fetchUsers(); // Refresh data
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setConfirmAction(null);
        }
    };

    const getStatusChip = (user: Profile) => {
        switch (user.status) {
            case 'active': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Ativo</span>;
            case 'suspended': 
                const until = user.suspended_until ? `até ${format(new Date(user.suspended_until), 'dd/MM')}` : '';
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Suspenso {until}</span>;
            case 'banned': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Banido</span>;
            default: return null;
        }
    };

    if (loading) return <div className="text-center">Carregando usuários...</div>;
    if (error) return <div className="text-center text-red-500">Erro: {error}</div>;

    const confirmationMessages: { [key: string]: string } = {
        'grant-plus': `conceder assinatura Plus para`,
        'revoke-plus': `revogar a assinatura Plus de`,
        'suspend': `suspender a conta de`,
        'ban': `BANIR PERMANENTEMENTE a conta de`,
        'reactivate': `reativar a conta de`,
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Gerenciamento de Usuários</h1>
            
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-sm bg-gray-700 rounded-lg py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
            </div>

            <div className="bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Usuário</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Assinatura</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Cadastro</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {currentUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            <img className="h-10 w-10 rounded-full object-cover" src={user.avatar_url} alt={user.username} />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-white">{user.username}</div>
                                            <div className="text-sm text-gray-400">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{getStatusChip(user)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.subscription_tier === 'plus' ? 'bg-green-100 text-green-800' : 'bg-gray-600 text-gray-200'}`}>
                                        {user.subscription_tier}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                    {user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy') : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <ActionDropdown user={user} onAction={(action, duration) => setConfirmAction({ user, action, duration })} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

             <div className="py-4 flex justify-between items-center">
                <span className="text-sm text-gray-400">
                    Página {currentPage} de {totalPages}
                </span>
                <div className="flex gap-2">
                    <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50">
                        Anterior
                    </button>
                    <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50">
                        Próxima
                    </button>
                </div>
            </div>
            {confirmAction && (
                <ConfirmationModal 
                    isOpen={!!confirmAction} 
                    title="Confirmar Ação"
                    message={`Tem certeza que deseja ${confirmationMessages[confirmAction.action]} ${confirmAction.user.username}?`}
                    onConfirm={handleConfirm}
                    onCancel={() => setConfirmAction(null)}
                    confirmText="Confirmar"
                />
            )}
        </div>
    );
};