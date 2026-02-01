
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Search, Package, LayoutGrid, List, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { getInventory, getProjectById, addInventoryItem, updateInventoryQuantity, deleteInventoryItem } from '../services/firestoreService';
import { exportProjectInventoryToExcel } from '../services/excelService';
import { Project, InventoryItem } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Card from '../components/ui/Card';

const ProjectInventory: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Form State
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: 'unid', category: 'Geral' });
  const [updateAmount, setUpdateAmount] = useState<number>(0);
  const [updateType, setUpdateType] = useState<'in' | 'out'>('in');

  const fetchDetails = async () => {
    if (!projectId) return;
    setLoading(true);
    const [proj, inv] = await Promise.all([
        getProjectById(projectId),
        getInventory(projectId)
    ]);
    setProject(proj);
    setInventory(inv);
    setLoading(false);
  };

  useEffect(() => {
    fetchDetails();
  }, [projectId]);

  const handleAddItem = async () => {
    if (!projectId || !project || !user) return;
    
    await addInventoryItem(
      {
        ...newItem,
        projectId,
        lastUpdated: Date.now(),
        lastUpdatedBy: user.email || 'unknown'
      },
      project.name,
      user
    );

    setIsAddModalOpen(false);
    setNewItem({ name: '', quantity: 0, unit: 'unid', category: 'Geral' });
    fetchDetails();
  };

  const openUpdateModal = (item: InventoryItem, type: 'in' | 'out') => {
    setSelectedItem(item);
    setUpdateType(type);
    setUpdateAmount(0);
    setIsUpdateModalOpen(true);
  };

  const handleUpdateStock = async () => {
    if (!selectedItem || !user || !projectId || !project) return;
    
    let newQty = selectedItem.quantity;
    if (updateType === 'in') {
      newQty += Number(updateAmount);
    } else {
      newQty -= Number(updateAmount);
    }

    if (newQty < 0) {
      alert("Estoque não pode ficar negativo.");
      return;
    }

    await updateInventoryQuantity(
      selectedItem.id, 
      selectedItem.name,
      newQty, 
      user, 
      projectId,
      project.name,
      updateType, 
      Number(updateAmount)
    );
    setIsUpdateModalOpen(false);
    fetchDetails();
  };

  const handleExportExcel = () => {
    if (project && inventory.length > 0) {
      exportProjectInventoryToExcel(project, inventory);
    } else {
      alert("Não há dados para exportar.");
    }
  };

  if (loading) return <div className="p-6">Carregando dados da obra...</div>;
  if (!project) return <div className="p-6">Projeto não encontrado.</div>;

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
           <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 flex items-center mb-2 text-sm">
             <ArrowLeft size={16} className="mr-1"/> Voltar
           </button>
           <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
           <p className="text-gray-500 flex items-center mt-1"><Package size={16} className="mr-2"/> Controle de Estoque</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visualização em Grade"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-100 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visualização em Lista"
            >
              <List size={18} />
            </button>
          </div>

          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={18} className="mr-2" /> Novo Item
          </Button>
        </div>
      </div>

      {/* Inventory Display */}
      {inventory.length === 0 ? (
        <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">Nenhum item no estoque desta obra.</p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            // GRID VIEW
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {inventory.map((item) => (
                <Card key={item.id} className="relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{item.name}</h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mt-1 inline-block">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {item.quantity} <span className="text-sm text-gray-500 font-normal">{item.unit}</span>
                        </div>
                      </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => openUpdateModal(item, 'out')}
                    >
                      <Minus size={16} className="mr-1" /> Saída
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
                      onClick={() => openUpdateModal(item, 'in')}
                    >
                      <Plus size={16} className="mr-1" /> Entrada
                    </Button>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-400 text-center">
                    Última att: {new Date(item.lastUpdated).toLocaleDateString()}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            // LIST VIEW
            <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd Atual</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Att</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-bold text-gray-900">{item.quantity} <span className="font-normal text-gray-500">{item.unit}</span></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.lastUpdated).toLocaleDateString()}
                          <div className="text-xs text-gray-400 max-w-[100px] truncate" title={item.lastUpdatedBy}>{item.lastUpdatedBy}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center space-x-2">
                            <button 
                              onClick={() => openUpdateModal(item, 'out')}
                              className="p-1 rounded-full text-red-600 hover:bg-red-50 border border-red-200"
                              title="Saída"
                            >
                              <Minus size={14} />
                            </button>
                            <button 
                              onClick={() => openUpdateModal(item, 'in')}
                              className="p-1 rounded-full text-green-600 hover:bg-green-50 border border-green-200"
                              title="Entrada"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Floating Action Button (Download Excel) */}
      <button 
        onClick={handleExportExcel}
        className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        title="Baixar Planilha de Estoque"
      >
        <FileSpreadsheet size={24} />
      </button>

      {/* Add Item Modal (Admin Only) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Adicionar Novo Item"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddItem}>Adicionar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input 
            label="Nome do Material" 
            value={newItem.name} 
            onChange={e => setNewItem({...newItem, name: e.target.value})}
            placeholder="Ex: Cimento CP II"
          />
          <div className="grid grid-cols-2 gap-4">
             <Input 
               label="Quantidade Inicial" 
               type="number" 
               value={newItem.quantity} 
               onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
             />
             <Input 
               label="Unidade" 
               value={newItem.unit} 
               onChange={e => setNewItem({...newItem, unit: e.target.value})}
               placeholder="sacos, kg, m..."
             />
          </div>
          <Input 
            label="Categoria" 
            value={newItem.category} 
            onChange={e => setNewItem({...newItem, category: e.target.value})}
            placeholder="Ex: Estrutural"
          />
        </div>
      </Modal>

      {/* Update Stock Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title={updateType === 'in' ? "Registrar Entrada" : "Registrar Saída"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsUpdateModalOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleUpdateStock} 
              variant={updateType === 'in' ? 'primary' : 'danger'}
            >
              Confirmar
            </Button>
          </>
        }
      >
         <div className="text-center mb-6">
            <h4 className="text-lg font-medium text-gray-900">{selectedItem?.name}</h4>
            <p className="text-sm text-gray-500">Estoque atual: {selectedItem?.quantity} {selectedItem?.unit}</p>
         </div>
         
         <div className="flex items-center justify-center gap-4">
            <button 
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200"
              onClick={() => setUpdateAmount(prev => Math.max(0, Number(prev) - 1))}
            >
              <Minus size={20} />
            </button>
            <div className="w-32">
              <Input 
                type="number" 
                className="text-center text-lg font-bold" 
                value={updateAmount}
                onChange={e => setUpdateAmount(Number(e.target.value))}
                min="0"
              />
            </div>
            <button 
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200"
              onClick={() => setUpdateAmount(prev => Number(prev) + 1)}
            >
              <Plus size={20} />
            </button>
         </div>
      </Modal>
    </div>
  );
};

export default ProjectInventory;
