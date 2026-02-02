
import React, { useEffect, useState } from 'react';
import { User, Project, UserRole } from '../../types';
import { getUsers, createUser, deleteUser, getProjects, updateUser, getRoles } from '../../services/firestoreService';
import { useAuth } from '../../services/authContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { UserPlus, Trash2, Shield, User as UserIcon, Pencil, HardHat, AlertTriangle, Lock } from 'lucide-react';

const ManageUsers: React.FC = () => {
  const { user: currentUser, checkPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roleId: '', 
    assignedProjects: [] as string[]
  });

  const fetchData = async () => {
    setLoading(true);
    const [usersData, projectsData, rolesData] = await Promise.all([
      getUsers(), 
      getProjects(),
      getRoles()
    ]);
    setUsers(usersData);
    setProjects(projectsData);
    setRoles(rolesData);
    setLoading(false);
  };

  useEffect(() => {
    if (checkPermission('manage_users')) {
       fetchData();
    } else {
       setLoading(false);
    }
  }, []);

  if (!checkPermission('manage_users')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <Lock className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Acesso Negado</h2>
        <p className="text-gray-500 mt-2 max-w-md">Você não tem permissão para gerenciar usuários. Contate o administrador do sistema.</p>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', roleId: '', assignedProjects: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingId(user.uid);
    setFormData({
      name: user.name,
      email: user.email,
      roleId: user.roleId || '',
      assignedProjects: user.assignedProjects || []
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    // Validate role
    if (!formData.roleId && !editingId) {
      alert("Selecione um tipo de usuário.");
      return;
    }
    
    // Determine legacy role string for backward compatibility
    const legacyRole = 'user'; 

    const payload = {
      ...formData,
      role: legacyRole as 'admin' | 'user'
    };

    if (editingId) {
      await updateUser(editingId, payload);
    } else {
      await createUser(payload);
    }
    setIsModalOpen(false);
    fetchData();
  };

  const handleDeleteUser = async (uid: string) => {
    if (currentUser?.uid === uid) {
      alert("Você não pode excluir sua própria conta.");
      return;
    }

    if(window.confirm('Remover este usuário?')) {
      await deleteUser(uid);
      fetchData();
    }
  };

  const handleProjectToggle = (projectId: string) => {
    setFormData(prev => {
      const exists = prev.assignedProjects.includes(projectId);
      if (exists) {
        return { ...prev, assignedProjects: prev.assignedProjects.filter(id => id !== projectId) };
      } else {
        return { ...prev, assignedProjects: [...prev.assignedProjects, projectId] };
      }
    });
  };

  const getRoleName = (roleId: string) => {
    if (roleId === 'super_admin') return 'Super Admin';
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Sem Cargo';
  };
  
  const getRoleColor = (roleId: string) => {
     if (roleId === 'super_admin') return 'bg-purple-100 text-purple-700';
     return 'bg-blue-100 text-blue-700';
  };

  // Check if selected role has "Access All Projects" permission
  const selectedRoleObj = roles.find(r => r.id === formData.roleId);
  const hasAccessAll = selectedRoleObj?.permissions.access_all_projects || false;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
           <p className="text-gray-500">Cadastre usuários e atribua cargos de acesso.</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <UserPlus size={18} className="mr-2" />
          Adicionar Usuário
        </Button>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acesso a Obras</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                 <tr>
                   <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                     Nenhum usuário encontrado.
                   </td>
                 </tr>
              ) : (
                users.map((u) => {
                   const roleName = u.role === 'admin' && !u.roleId ? 'Super Admin (Legacy)' : getRoleName(u.roleId);
                   const assignedCount = u.assignedProjects?.length || 0;

                   return (
                    <tr key={u.uid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600`}>
                             <UserIcon size={20} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {u.name} 
                              {currentUser?.uid === u.uid && <span className="ml-2 text-xs text-gray-400 font-normal">(Você)</span>}
                            </div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(u.roleId || (u.role === 'admin' ? 'super_admin' : ''))}`}>
                            {roleName}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                           {roles.find(r => r.id === u.roleId)?.permissions.access_all_projects || u.role === 'admin'
                               ? <span className="text-green-600 font-medium text-xs">Acesso Total</span>
                               : assignedCount > 0 
                                 ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                     {assignedCount} obra(s) vinculada(s)
                                   </span>
                                 : <span className="text-red-400 text-xs">Nenhuma obra vinculada</span>
                           }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <button 
                            onClick={() => handleOpenEdit(u)}
                            className="text-gray-400 hover:text-primary transition-colors"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>
                          
                          {currentUser?.uid !== u.uid ? (
                            <button 
                              onClick={() => handleDeleteUser(u.uid)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          ) : (
                            <button 
                              disabled
                              className="text-gray-200 cursor-not-allowed"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Usuário" : "Novo Usuário"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveUser}>
              {editingId ? "Atualizar" : "Salvar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome Completo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="João Silva"
          />
          <Input
            label="Email Google"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="joao@gmail.com"
            disabled={!!editingId}
          />
          {editingId && <p className="text-xs text-gray-500 -mt-3">O email não pode ser alterado para usuários existentes.</p>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Usuário (Cargo)</label>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={formData.roleId}
              onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
            >
               <option value="">Selecione um cargo...</option>
               {roles.map(role => (
                 <option key={role.id} value={role.id}>{role.name}</option>
               ))}
            </select>
            {roles.length === 0 && <p className="text-xs text-red-500 mt-1">Nenhum cargo criado. Crie cargos na aba "Tipos de Usuário".</p>}
          </div>

          {!hasAccessAll && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Obras Permitidas</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                {projects.map(p => (
                  <label key={p.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input 
                      type="checkbox"
                      checked={formData.assignedProjects.includes(p.id)}
                      onChange={() => handleProjectToggle(p.id)}
                      className="rounded text-primary focus:ring-primary h-4 w-4 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{p.name}</span>
                  </label>
                ))}
                {projects.length === 0 && <p className="text-sm text-gray-400">Nenhuma obra cadastrada.</p>}
              </div>
            </div>
          )}

          {hasAccessAll && (
            <div className="mt-2 p-3 bg-green-50 rounded-md border border-green-100 flex items-start gap-2">
               <Shield size={16} className="text-green-600 mt-0.5" />
               <p className="text-sm text-green-700">
                 Este cargo possui permissão de <b>Acesso Total</b>. O usuário poderá ver todas as obras, independente da seleção acima.
               </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ManageUsers;
