
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Search, Package, LayoutGrid, List, FileSpreadsheet, Pencil, Trash2, Check, DollarSign, Filter, X, Tag } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { getInventory, getProjectById, addInventoryItem, updateInventoryQuantity, deleteInventoryItem, getSupplies, updateInventoryItem, addSupply } from '../services/firestoreService';
import { exportProjectInventoryToExcel } from '../services/excelService';
import { Project, InventoryItem, Supply } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Card from '../components/ui/Card';

const ProjectInventory: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, checkPermission } = useAuth();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State - Initialize from localStorage or default to 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const savedMode = localStorage.getItem('otrack_inventory_view_mode');
    return (savedMode === 'grid' || savedMode === 'list') ? savedMode : 'list';
  });

  // Filters State
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem('otrack_inventory_view_mode', viewMode);
  }, [viewMode]);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [isCreateSupplyModalOpen, setIsCreateSupplyModalOpen] = useState(false); // Nested modal

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Form State - Add Item
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: '', category: '', category2: '', price: '' });
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  
  // Form State - Edit Item
  const [editItemData, setEditItemData] = useState({ name: '', category: '', category2: '', unitPrice: '' });

  // Form State - Create New Supply (Nested)
  const [newSupplyData, setNewSupplyData] = useState({ name: '', unit: '', category: '', price: '' });

  // Stock Update State
  const [updateAmount, setUpdateAmount] = useState<number>(0);
  const [updateType, setUpdateType] = useState<'in' | 'out'>('in');

  // Search/Combobox State (For Adding Items)
  const [supplySearchTerm, setSupplySearchTerm] = useState('');
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  const fetchDetails = async () => {
    if (!projectId) return;
    setLoading(true);
    const [proj, inv, supp] = await Promise.all([
        getProjectById(projectId),
        getInventory(projectId),
        getSupplies()
    ]);
    setProject(proj);
    setInventory(inv);
    setSupplies(supp);
    setLoading(false);
  };

  useEffect(() => {
    fetchDetails();
  }, [projectId]);

  // Click outside listener for combobox
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Filtering Logic for Inventory Display ---
  const uniqueCategories = Array.from(new Set(inventory.map(item => item.category))).filter(Boolean).sort();

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(inventorySearchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSupplySelect = (supply: Supply) => {
    setSelectedSupply(supply);
    setSupplySearchTerm(supply.name);
    setNewItem({
      ...newItem,
      name: supply.name,
      unit: supply.unit,
      category: supply.category,
      category2: '', // Reset secondary category as it's specific to the project item
      price: supply.price ? supply.price.toString() : ''
    });
    setIsComboboxOpen(false);
  };

  const handleOpenCreateSupply = () => {
    setIsComboboxOpen(false);
    setNewSupplyData({ name: supplySearchTerm, unit: '', category: '', price: '' });
    setIsCreateSupplyModalOpen(true);
  };

  const handleCreateSupplySave = async () => {
    if (!newSupplyData.name || !newSupplyData.unit) return;
    try {
      const payload = {
        name: newSupplyData.name,
        unit: newSupplyData.unit,
        category: newSupplyData.category,
        price: newSupplyData.price ? parseFloat(newSupplyData.price) : 0
      };
      const newSupply = await addSupply(payload);
      setSupplies(prev => [...prev, newSupply]); // Optimistic update
      
      // Auto-select the newly created supply in the Add Item form
      handleSupplySelect(newSupply);
      
      setIsCreateSupplyModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Erro ao criar insumo.');
    }
  };

  const handleAddItem = async () => {
    if (!projectId || !project || !user) return;
    
    if (!selectedSupply) {
      alert("Selecione um insumo.");
      return;
    }

    await addInventoryItem(
      {
        projectId,
        name: selectedSupply.name,
        unit: selectedSupply.unit,
        category: selectedSupply.category, // Categoria do Insumo (Padrão)
        category2: newItem.category2, // Subcategoria (Específica da Obra)
        quantity: newItem.quantity,
        unitPrice: newItem.price ? parseFloat(newItem.price) : undefined,
        lastUpdated: Date.now(),
        lastUpdatedBy: user.email || 'unknown'
      },
      project.name,
      user
    );

    setIsAddModalOpen(false);
    // Reset form
    setNewItem({ name: '', quantity: 0, unit: '', category: '', category2: '', price: '' });
    setSelectedSupply(null);
    setSupplySearchTerm('');
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

  const handleEditItemOpen = (item: InventoryItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedItem(item);
    setEditItemData({
      name: item.name,
      category: item.category,
      category2: item.category2 || '',
      unitPrice: item.unitPrice ? item.unitPrice.toString() : ''
    });
    setIsEditItemModalOpen(true);
  };

  const handleEditItemSave = async () => {
    if (!selectedItem) return;
    await updateInventoryItem(selectedItem.id, {
      name: editItemData.name,
      category: editItemData.category,
      category2: editItemData.category2,
      unitPrice: editItemData.unitPrice ? parseFloat(editItemData.unitPrice) : undefined
    });
    setIsEditItemModalOpen(false);
    fetchDetails();
  };

  const handleDeleteItem = async (item: InventoryItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if(window.confirm(`Tem certeza que deseja remover "${item.name}" do estoque desta obra?`)) {
      try {
        await deleteInventoryItem(item.id);
        fetchDetails();
      } catch (err) {
        console.error("Erro ao excluir:", err);
        alert("Ocorreu um erro ao tentar excluir o item.");
      }
    }
  };

  const handleExportExcel = () => {
    if (project && inventory.length > 0) {
      exportProjectInventoryToExcel(project, inventory);
    } else {
      alert("Não há dados para exportar.");
    }
  };

  const filteredSupplies = supplies.filter(s => 
    s.name.toLowerCase().includes(supplySearchTerm.toLowerCase())
  );

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
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

          {checkPermission('inventory_add') && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus size={18} className="mr-2" /> Novo Item
            </Button>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Pesquisar item..."
              value={inventorySearchTerm}
              onChange={(e) => setInventorySearchTerm(e.target.value)}
              className="pl-9 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {inventorySearchTerm && (
              <button 
                onClick={() => setInventorySearchTerm('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
         </div>
         
         <div className="w-full md:w-64 relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            >
               <option value="all">Todas as Categorias</option>
               {uniqueCategories.map(cat => (
                 <option key={cat} value={cat}>{cat}</option>
               ))}
            </select>
            <div className="absolute right-3 top-3 pointer-events-none">
               <div className="border-[4px] border-transparent border-t-gray-500"></div>
            </div>
         </div>
      </div>

      {/* Inventory Display */}
      {inventory.length === 0 ? (
        <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">Nenhum item no estoque desta obra.</p>
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="col-span-full py-12 text-center bg-gray-50 rounded-lg">
          <Search className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-gray-500">Nenhum item encontrado com os filtros atuais.</p>
          <Button variant="link" onClick={() => { setInventorySearchTerm(''); setCategoryFilter('all'); }}>
             Limpar Filtros
          </Button>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            // GRID VIEW
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {filteredInventory.map((item) => (
                <Card key={item.id} className="relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{item.name}</h3>
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded inline-block w-fit">
                            {item.category}
                          </span>
                          {item.category2 && (
                             <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 ml-1">
                               <Tag size={10} /> {item.category2}
                             </span>
                          )}
                          {item.unitPrice && (
                            <span className="text-xs text-gray-500 mt-1">
                              Pago: {formatCurrency(item.unitPrice)} / {item.unit}
                            </span>
                          )}
                        </div>
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
                      disabled={!checkPermission('inventory_edit')}
                    >
                      <Minus size={16} className="mr-1" /> Saída
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
                      onClick={() => openUpdateModal(item, 'in')}
                      disabled={!checkPermission('inventory_edit')}
                    >
                      <Plus size={16} className="mr-1" /> Entrada
                    </Button>
                  </div>
                  
                  {/* Action Buttons (Edit/Delete) */}
                  {(checkPermission('inventory_edit') || checkPermission('inventory_delete')) && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded backdrop-blur-sm">
                      {checkPermission('inventory_edit') && (
                        <button onClick={(e) => handleEditItemOpen(item, e)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded">
                          <Pencil size={14} />
                        </button>
                      )}
                      {checkPermission('inventory_delete') && (
                        <button onClick={(e) => handleDeleteItem(item, e)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}

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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categorias</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Pago (Unit)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd Atual</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Att</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 w-fit">
                               {item.category}
                             </span>
                             {item.category2 && (
                               <span className="text-xs text-gray-500 ml-1">
                                 ↳ {item.category2}
                               </span>
                             )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-bold text-gray-900">{item.quantity} <span className="font-normal text-gray-500">{item.unit}</span></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.lastUpdated).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center items-center space-x-2">
                             {/* Edit/Delete for List View */}
                             <div className="flex items-center mr-2 border-r border-gray-200 pr-2 space-x-1">
                                {checkPermission('inventory_edit') && (
                                  <button onClick={(e) => handleEditItemOpen(item, e)} className="p-1 text-gray-400 hover:text-primary rounded">
                                    <Pencil size={14} />
                                  </button>
                                )}
                                {checkPermission('inventory_delete') && (
                                  <button onClick={(e) => handleDeleteItem(item, e)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                             </div>

                            <button 
                              onClick={() => openUpdateModal(item, 'out')}
                              className={`p-1 rounded-full border ${!checkPermission('inventory_edit') ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-red-600 hover:bg-red-50 border-red-200'}`}
                              title="Saída"
                              disabled={!checkPermission('inventory_edit')}
                            >
                              <Minus size={14} />
                            </button>
                            <button 
                              onClick={() => openUpdateModal(item, 'in')}
                              className={`p-1 rounded-full border ${!checkPermission('inventory_edit') ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-green-600 hover:bg-green-50 border-green-200'}`}
                              title="Entrada"
                              disabled={!checkPermission('inventory_edit')}
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

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Adicionar Item ao Estoque"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddItem} disabled={!selectedSupply}>Adicionar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div ref={comboboxRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar Insumo
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-9 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Digite para buscar..."
                value={supplySearchTerm}
                onChange={(e) => {
                  setSupplySearchTerm(e.target.value);
                  setIsComboboxOpen(true);
                  if (!e.target.value) setSelectedSupply(null);
                }}
                onFocus={() => setIsComboboxOpen(true)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Dropdown Results */}
            {isComboboxOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                <ul className="py-1">
                  {/* Create New Option (Admin Only) */}
                  {checkPermission('manage_supplies') && (
                    <li 
                      onClick={handleOpenCreateSupply}
                      className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer text-sm text-blue-600 font-medium border-b border-gray-100 flex items-center gap-2"
                    >
                      <Plus size={14} /> Cadastrar Novo: "{supplySearchTerm || 'Novo Insumo'}"
                    </li>
                  )}
                  
                  {filteredSupplies.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-500 italic">
                      Nenhum insumo encontrado.
                    </li>
                  ) : (
                    filteredSupplies.map((supply) => (
                      <li
                        key={supply.id}
                        onClick={() => handleSupplySelect(supply)}
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-50 flex justify-between items-center ${selectedSupply?.id === supply.id ? 'bg-gray-100' : ''}`}
                      >
                         <div>
                           <span className="font-medium text-gray-900">{supply.name}</span>
                           <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{supply.category}</span>
                         </div>
                         {selectedSupply?.id === supply.id && <Check size={14} className="text-primary"/>}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
            
            {selectedSupply && (
              <div className="mt-2 p-2 rounded border border-blue-100 bg-blue-50">
                <div className="text-xs text-blue-800 flex items-center mb-1">
                  <Check size={12} className="mr-1" />
                  Insumo Selecionado: <b>{selectedSupply.name}</b> ({selectedSupply.unit})
                </div>
                <div className="text-xs text-gray-500">
                  Preço Base (Catálogo): {selectedSupply.price ? formatCurrency(selectedSupply.price) : 'Não definido'}
                </div>
              </div>
            )}
          </div>

          {selectedSupply && (
             <Input 
                label="Categoria (Do Insumo)" 
                value={selectedSupply.category} 
                disabled 
                className="bg-gray-100"
             />
          )}

          <div className="grid grid-cols-2 gap-4">
             <Input 
               label="Quantidade Inicial" 
               type="number" 
               value={newItem.quantity} 
               onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
             />
             <Input 
               label="Subcategoria / Detalhe" 
               placeholder="Ex: Marca X, Sala 1"
               value={newItem.category2} 
               onChange={e => setNewItem({...newItem, category2: e.target.value})}
             />
          </div>
          
          <div className="relative">
            <Input 
              label="Valor Unitário Real (Nota Fiscal)" 
              type="number"
              step="0.01" 
              placeholder="0.00"
              className="pl-8"
              value={newItem.price} 
              onChange={e => setNewItem({...newItem, price: e.target.value})}
            />
            <div className="absolute left-3 top-[34px] text-gray-400 pointer-events-none">
              <DollarSign size={14} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Este é o valor efetivamente pago pelo item nesta obra.</p>
          </div>
        </div>
      </Modal>

      {/* Create New Supply Nested Modal */}
      <Modal
        isOpen={isCreateSupplyModalOpen}
        onClose={() => setIsCreateSupplyModalOpen(false)}
        title="Cadastrar Novo Insumo"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateSupplyModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateSupplySave}>Salvar e Selecionar</Button>
          </>
        }
      >
        <div className="space-y-4">
           <Input 
             label="Nome do Insumo"
             value={newSupplyData.name}
             onChange={e => setNewSupplyData({...newSupplyData, name: e.target.value})}
             autoFocus
           />
           <div className="grid grid-cols-2 gap-4">
             <Input 
               label="Categoria"
               placeholder="Ex: Elétrica"
               value={newSupplyData.category}
               onChange={e => setNewSupplyData({...newSupplyData, category: e.target.value})}
             />
             <Input 
               label="Unidade"
               placeholder="Ex: un, m, kg"
               value={newSupplyData.unit}
               onChange={e => setNewSupplyData({...newSupplyData, unit: e.target.value})}
             />
           </div>
           <div className="relative">
             <Input 
               label="Preço de Referência (Opcional)"
               type="number"
               step="0.01"
               className="pl-8"
               value={newSupplyData.price}
               onChange={e => setNewSupplyData({...newSupplyData, price: e.target.value})}
             />
             <div className="absolute left-3 top-[34px] text-gray-400 pointer-events-none">
                <DollarSign size={14} />
             </div>
           </div>
        </div>
      </Modal>

      {/* Update Stock Modal (In/Out) */}
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

      {/* Edit Item Details Modal */}
      <Modal
        isOpen={isEditItemModalOpen}
        onClose={() => setIsEditItemModalOpen(false)}
        title="Editar Item"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditItemModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditItemSave}>Salvar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input 
             label="Nome" 
             value={editItemData.name} 
             onChange={e => setEditItemData({...editItemData, name: e.target.value})} 
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
               label="Categoria Principal" 
               value={editItemData.category} 
               onChange={e => setEditItemData({...editItemData, category: e.target.value})} 
            />
            <Input 
               label="Subcategoria / Detalhe" 
               value={editItemData.category2} 
               onChange={e => setEditItemData({...editItemData, category2: e.target.value})} 
            />
          </div>
          <div className="relative">
             <Input 
               label="Valor Unitário (Pago)" 
               type="number"
               step="0.01"
               className="pl-8"
               value={editItemData.unitPrice} 
               onChange={e => setEditItemData({...editItemData, unitPrice: e.target.value})} 
             />
             <div className="absolute left-3 top-[34px] text-gray-400 pointer-events-none">
                <DollarSign size={14} />
             </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectInventory;
