
import React, { useEffect, useState } from 'react';
import { User, Project } from '../../types';
import { getUsers, createUser, deleteUser, getProjects, updateUser } from '../../services/firestoreService';
import { useAuth } from '../../services/authContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { UserPlus, Trash2, Shield, User as UserIcon, Pencil, HardHat } from 'lucide-react';

const ManageUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user' as 'user' | 'admin',
    assignedProjects: [] as string[]
  });

  const fetchData = async () => {
    setLoading(true);
    const [usersData, projectsData] = await Promise.all([getUsers(), getProjects()]);
    setUsers(usersData);
    setProjects(projectsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', role: 'user', assignedProjects: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingId(user.uid);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      assignedProjects: user.assignedProjects || []
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (editingId) {
      await updateUser(editingId, formData);
    } else {
      await createUser(formData);
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

  const admins = users.filter(u => u.role === 'admin');
  const fieldUsers = users.filter(u => u.role === 'user');

  const UserTable = ({ data, type }: { data: User[], type: 'admin' | 'user' }) => (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome/Email</th>
              {type === 'user' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acesso a Obras</th>
              )}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
               <tr>
                 <td colSpan={type === 'user' ? 3 : 2} className="px-6 py-8 text-center text-gray-500 text-sm">
                   Nenhum usuário encontrado nesta categoria.
                 </td>
               </tr>
            ) : (
              data.map((u) => (
                <tr key={u.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${type === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                         {type === 'admin' ? <Shield size={20}/> : <HardHat size={20} />}
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
                  {type === 'user' && (
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                         {u.assignedProjects.length > 0 
                             ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                 {u.assignedProjects.length} obra(s) vinculada(s)
                               </span>
                             : <span className="text-red-400 text-xs">Nenhuma obra vinculada</span>
                         }
                      </div>
                    </td>
                  )}
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
                          title="Você não pode excluir sua própria conta"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
           <p className="text-gray-500">Controle de acesso ao sistema.</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <UserPlus size={18} className="mr-2" />
          Adicionar Usuário
        </Button>
      </div>

      <div className="grid gap-8">
        {/* Admin Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
             <div className="p-1.5 bg-purple-100 text-purple-700 rounded-md">
                <Shield size={18} />
             </div>
             <h2 className="text-lg font-bold text-gray-800">Administradores</h2>
             <span className="ml-2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{admins.length}</span>
          </div>
          <UserTable data={admins} type="admin" />
        </section>

        {/* User Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
             <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                <HardHat size={18} />
             </div>
             <h2 className="text-lg font-bold text-gray-800">Usuários de Campo</h2>
             <span className="ml-2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{fieldUsers.length}</span>
          </div>
          <UserTable data={fieldUsers} type="user" />
        </section>
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
          
          <Select
            label="Tipo de Usuário"
            options={[
              { label: 'Usuário de Campo', value: 'user' },
              { label: 'Administrador', value: 'admin' },
            ]}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
          />

          {formData.role === 'user' && (
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
        </div>
      </Modal>
    </div>
  );
};

export default ManageUsers;
