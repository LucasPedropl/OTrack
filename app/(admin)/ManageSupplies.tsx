
import React, { useEffect, useState } from 'react';
import { Supply } from '../../types';
import { getSupplies, addSupply, updateSupply, deleteSupply } from '../../services/firestoreService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { Search, Plus, Pencil, Trash2, PackageOpen, Tag, DollarSign, Lock } from 'lucide-react';
import Card from '../../components/ui/Card';
import { useAuth } from '../../services/authContext';

const ManageSupplies: React.FC = () => {
  const { checkPermission } = useAuth();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    category: '',
    price: '' // Manage as string for input handling
  });

  const fetchSupplies = async () => {
    setLoading(true);
    try {
      const data = await getSupplies();
      setSupplies(data);
    } catch (error) {
      console.error("Error fetching supplies", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkPermission('manage_supplies')) {
        fetchSupplies();
    } else {
        setLoading(false);
    }
  }, []);

  if (!checkPermission('manage_supplies')) {
     return (
       <div className="flex flex-col items-center justify-center h-[60vh] text-center">
         <div className="bg-red-50 p-4 rounded-full mb-4">
           <Lock className="h-10 w-10 text-red-500" />
         </div>
         <h2 className="text-2xl font-bold text-gray-900">Acesso Negado</h2>
         <p className="text-gray-500 mt-2 max-w-md">Você não tem permissão para gerenciar o catálogo de insumos.</p>
       </div>
     );
  }

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ name: '', unit: '', category: '', price: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supply: Supply) => {
    setEditingId(supply.id);
    setFormData({
      name: supply.name,
      unit: supply.unit,
      category: supply.category,
      price: supply.price ? supply.price.toString() : ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const payload = {
      name: formData.name,
      unit: formData.unit,
      category: formData.category,
      price: formData.price ? parseFloat(formData.price) : 0
    };

    try {
      if (editingId) {
        await updateSupply(editingId, payload);
      } else {
        await addSupply(payload);
      }
      setIsModalOpen(false);
      fetchSupplies();
    } catch (error) {
      console.error("Error saving supply", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este insumo do catálogo?')) {
      await deleteSupply(id);
      fetchSupplies();
    }
  };

  const filteredSupplies = supplies.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Insumos</h1>
          <p className="text-gray-500">Gerencie a lista padrão de materiais e insumos.</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus size={18} className="mr-2" /> Novo Insumo
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar insumo por nome ou categoria..."
            className="pl-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome do Insumo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço Ref.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                   <tr>
                     <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando catálogo...</td>
                   </tr>
                ) : filteredSupplies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <PackageOpen className="h-10 w-10 text-gray-300 mb-3" />
                        <p className="font-medium text-gray-900">Nenhum insumo encontrado</p>
                        <p className="text-sm mt-1">Adicione materiais para padronizar o cadastro.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSupplies.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-gray-100 rounded flex items-center justify-center text-gray-500 mr-3">
                            <Tag size={14} />
                          </div>
                          <span className="font-medium text-gray-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Insumo" : "Novo Insumo"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar Alterações" : "Adicionar"}</Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input 
            label="Nome do Insumo" 
            placeholder="Ex: Cimento CP II" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
            autoFocus
          />
          <div className="grid grid-cols-2 gap-4">
             <Input 
              label="Categoria" 
              placeholder="Ex: Estrutural" 
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              required
            />
             <Input 
              label="Unidade de Medida" 
              placeholder="Ex: sc, kg, m³" 
              value={formData.unit}
              onChange={e => setFormData({...formData, unit: e.target.value})}
              required
            />
          </div>
          <div className="relative">
             <Input 
              label="Preço Unitário (Opcional)" 
              type="number"
              step="0.01"
              placeholder="0.00" 
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
              className="pl-8"
            />
            <div className="absolute left-3 top-[34px] text-gray-400 pointer-events-none">
              <DollarSign size={14} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ManageSupplies;
