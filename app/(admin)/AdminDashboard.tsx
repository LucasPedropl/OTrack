
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, MapPin, Calendar, ArrowRight, Pencil, Trash2, FileSpreadsheet, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { Project } from '../../types';
import { getProjects, createProject, deleteProject, updateProject, getInventory } from '../../services/firestoreService';
import { useProjectContext } from '../../services/projectContext';
import { exportProjectInventoryToExcel } from '../../services/excelService';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const AdminDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { triggerUpdate } = useProjectContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    status: 'active' as 'active' | 'completed' | 'paused'
  });

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ name: '', address: '', status: 'active' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(project.id);
    setFormData({
      name: project.name,
      address: project.address,
      status: project.status
    });
    setIsModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) {
      alert("Por favor, preencha o nome e o endereço da obra.");
      return;
    }

    try {
      if (editingId) {
        await updateProject(editingId, formData);
      } else {
        await createProject({
          ...formData,
          createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
      fetchProjects();
      triggerUpdate();
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);
    }
  };

  const handleOpenDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProject(projectToDelete);
      await fetchProjects();
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
      triggerUpdate();
    } catch (error) {
      console.error("Erro ao excluir obra:", error);
    }
  };

  const handleExportAll = async () => {
    if (projects.length === 0) return;
    if (!window.confirm(`Isso irá gerar e baixar ${projects.length} arquivos Excel.`)) return;
    setExporting(true);
    try {
      for (const project of projects) {
        const inventory = await getInventory(project.id);
        exportProjectInventoryToExcel(project, inventory);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("Error exporting files", error);
    } finally {
      setExporting(false);
    }
  };

  // Aesthetic: Simple dot status instead of badges
  const getStatusIndicator = (status: string) => {
    switch(status) {
      case 'active':
        return <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>;
      case 'paused':
        return <span className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-100"></span>;
      default:
        return <span className="h-2 w-2 rounded-full bg-gray-400 ring-2 ring-gray-100"></span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 min-h-[calc(100vh-140px)]">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Painel Geral</h1>
          <p className="text-gray-500 mt-1 text-sm">Visão geral e gerenciamento estratégico das obras.</p>
        </div>
        <Button onClick={handleOpenCreate} className="shadow-sm">
          <Plus size={16} className="mr-2" />
          Nova Obra
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-16 text-center bg-gray-50">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
             <Building2 className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Nenhuma obra cadastrada</h3>
          <p className="mt-1 text-sm text-gray-500 mb-6">Comece adicionando seu primeiro projeto.</p>
          <Button onClick={handleOpenCreate}>Criar Primeira Obra</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="group flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-subtle transition-all cursor-default"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                   <div className="flex gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-md bg-gray-100 flex items-center justify-center text-gray-600">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base leading-tight">
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          {project.id.slice(0, 6)}
                        </p>
                      </div>
                   </div>
                   <div title={project.status}>
                      {getStatusIndicator(project.status)}
                   </div>
                </div>

                <div className="space-y-2 mt-4 pl-1">
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin size={14} className="mr-2.5 text-gray-400 shrink-0" />
                    <span className="truncate">{project.address}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar size={14} className="mr-2.5 text-gray-400 shrink-0" />
                    <span>{new Date(project.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                <div className="flex gap-1">
                   <button 
                     onClick={(e) => handleOpenEdit(project, e)}
                     className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                     title="Configurações"
                   >
                     <Pencil size={16} />
                   </button>
                   <button 
                     onClick={(e) => handleOpenDelete(project.id, e)}
                     className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                     title="Excluir"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>

                <button 
                  onClick={() => navigate(`/admin/project/${project.id}/inventory`)}
                  className="text-sm font-medium text-gray-900 hover:underline flex items-center"
                >
                  Ver Estoque <ArrowRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={handleExportAll}
        disabled={exporting}
        className={`fixed bottom-8 right-8 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg border border-gray-200 transition-all ${exporting ? 'bg-gray-100 cursor-not-allowed' : 'bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-300'}`}
        title="Relatório Geral"
      >
        {exporting ? (
          <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <FileSpreadsheet size={20} />
        )}
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Obra" : "Nova Obra"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveProject}>
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSaveProject}>
          <Input
            label="Nome"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Residencial Horizon"
          />
          <Input
            label="Endereço"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Endereço completo"
          />
          <Select
            label="Status"
            options={[
              { label: 'Em Andamento', value: 'active' },
              { label: 'Pausado', value: 'paused' },
              { label: 'Concluído', value: 'completed' },
            ]}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          />
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Projeto"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={confirmDelete}>
              Excluir
            </Button>
          </>
        }
      >
        <div className="text-center p-4">
           <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto text-red-600">
             <AlertTriangle size={20} />
           </div>
           <p className="text-gray-600 text-sm">
             Você está prestes a excluir permanentemente esta obra e todo o histórico.
           </p>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
