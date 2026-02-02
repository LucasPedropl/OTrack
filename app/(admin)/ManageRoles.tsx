
import React, { useEffect, useState } from 'react';
import { UserRole } from '../../types';
import { getRoles, createRole, updateRole, deleteRole } from '../../services/firestoreService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import { Shield, Plus, Pencil, Trash2, CheckCircle2, XCircle, LayoutGrid, Lock } from 'lucide-react';
import { useAuth } from '../../services/authContext';

const defaultPermissions: UserRole['permissions'] = {
  view_dashboard: true,
  manage_users: false,
  manage_roles: false,
  manage_supplies: false,
  manage_projects: false,
  access_all_projects: false,
  inventory_view: true,
  inventory_add: false,
  inventory_edit: false,
  inventory_delete: false
};

const permissionLabels: Record<keyof UserRole['permissions'], string> = {
  view_dashboard: "Ver Painel Geral",
  manage_users: "Gerenciar Usuários",
  manage_roles: "Gerenciar Tipos de Usuário",
  manage_supplies: "Gerenciar Catálogo de Insumos",
  manage_projects: "Criar/Excluir Obras",
  access_all_projects: "Acessar TODAS as Obras (Ignora vínculo)",
  inventory_view: "Visualizar Estoque",
  inventory_add: "Adicionar Itens ao Estoque",
  inventory_edit: "Editar/Movimentar Estoque",
  inventory_delete: "Excluir Itens do Estoque"
};

const permissionGroups = {
  "Administração": ["view_dashboard", "manage_users", "manage_roles", "manage_supplies", "manage_projects", "access_all_projects"],
  "Operação de Estoque": ["inventory_view", "inventory_add", "inventory_edit", "inventory_delete"]
};

const ManageRoles: React.FC = () => {
  const { checkPermission } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{name: string; permissions: UserRole['permissions']}>({
    name: '',
    permissions: { ...defaultPermissions }
  });

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkPermission('manage_roles')) {
       fetchRoles();
    } else {
       setLoading(false);
    }
  }, []);

  if (!checkPermission('manage_roles')) {
     return (
       <div className="flex flex-col items-center justify-center h-[60vh] text-center">
         <div className="bg-red-50 p-4 rounded-full mb-4">
           <Lock className="h-10 w-10 text-red-500" />
         </div>
         <h2 className="text-2xl font-bold text-gray-900">Acesso Negado</h2>
         <p className="text-gray-500 mt-2 max-w-md">Você não tem permissão para gerenciar tipos de usuário.</p>
       </div>
     );
  }

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ name: '', permissions: { ...defaultPermissions } });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: UserRole) => {
    setEditingId(role.id);
    setFormData({
      name: role.name,
      permissions: { ...role.permissions }
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Nome do tipo de usuário é obrigatório");
      return;
    }

    try {
      if (editingId) {
        await updateRole(editingId, formData);
      } else {
        await createRole(formData);
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar tipo de usuário");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza? Usuários com este tipo perderão acesso.")) {
      await deleteRole(id);
      fetchRoles();
    }
  };

  const togglePermission = (key: keyof UserRole['permissions']) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tipos de Usuário</h1>
          <p className="text-gray-500">Defina cargos e suas permissões de acesso ao sistema.</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus size={18} className="mr-2" /> Novo Tipo
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-10">Carregando...</div>
        ) : roles.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
             <Shield className="mx-auto h-12 w-12 text-gray-300" />
             <p className="mt-2 text-gray-600">Nenhum tipo de usuário definido.</p>
          </div>
        ) : (
          roles.map((role) => (
            <Card key={role.id} className="relative hover:shadow-md transition-shadow">
               <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Shield size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">{role.name}</h3>
                 </div>
                 <div className="flex gap-1">
                   <button onClick={() => handleOpenEdit(role)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50">
                     <Pencil size={16} />
                   </button>
                   <button onClick={() => handleDelete(role.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50">
                     <Trash2 size={16} />
                   </button>
                 </div>
               </div>
               
               <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Acessos Principais</div>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.access_all_projects ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                        Todas as Obras
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Apenas Vinculadas
                      </span>
                    )}
                    {role.permissions.manage_users && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        Gerenciar Usuários
                      </span>
                    )}
                     {role.permissions.manage_supplies && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        Gerenciar Insumos
                      </span>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                     <span>Permissões ativas:</span>
                     <span className="font-medium text-gray-900">
                       {Object.values(role.permissions).filter(Boolean).length} / {Object.keys(role.permissions).length}
                     </span>
                  </div>
               </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Tipo de Usuário" : "Novo Tipo de Usuário"}
        footer={
           <>
             <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
             <Button onClick={handleSave}>Salvar Definições</Button>
           </>
        }
      >
        <div className="space-y-6">
           <Input 
             label="Nome do Cargo"
             placeholder="Ex: Engenheiro Residente, Estagiário..."
             value={formData.name}
             onChange={e => setFormData({...formData, name: e.target.value})}
             autoFocus
           />
           
           <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
             {Object.entries(permissionGroups).map(([groupName, keys]) => (
               <div key={groupName}>
                 <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 mb-3 flex items-center gap-2">
                   <LayoutGrid size={14} /> {groupName}
                 </h4>
                 <div className="space-y-2">
                   {keys.map((key) => (
                     <label key={key} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-all">
                        <span className="text-sm text-gray-700">{permissionLabels[key as keyof UserRole['permissions']]}</span>
                        <div 
                          onClick={(e) => {
                             e.preventDefault(); // Prevent double toggle due to label wrapping
                             togglePermission(key as keyof UserRole['permissions']);
                          }}
                          className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${formData.permissions[key as keyof UserRole['permissions']] ? 'bg-primary' : 'bg-gray-300'}`}
                        >
                          <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${formData.permissions[key as keyof UserRole['permissions']] ? 'translate-x-5' : ''}`}></div>
                        </div>
                     </label>
                   ))}
                 </div>
               </div>
             ))}
           </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageRoles;
