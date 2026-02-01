
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FolderKanban, X, Box, ChevronLeft, ChevronRight, 
  Building2, History, Settings, MoreHorizontal, Pencil, Download, Trash2, GripVertical
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useAuth } from '../../services/authContext';
import { useProjectContext } from '../../services/projectContext';
import { getProjects, getProjectsForUser, updateUserProjectOrder, updateProject, deleteProject, getInventory } from '../../services/firestoreService';
import { exportProjectInventoryToExcel } from '../../services/excelService';
import { Project } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// -- Tooltip Component --
interface SidebarTooltipProps {
  label: string;
  show: boolean;
  children: React.ReactElement<any>;
}

const SidebarTooltip: React.FC<SidebarTooltipProps> = ({ label, show, children }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  if (!show) return children;

  return (
    <>
      {React.cloneElement(children, {
        onMouseEnter: (e: React.MouseEvent) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setCoords({ 
            top: rect.top + (rect.height / 2), 
            left: rect.right + 12 
          });
          setVisible(true);
          children.props.onMouseEnter?.(e);
        },
        onMouseLeave: (e: React.MouseEvent) => {
          setVisible(false);
          children.props.onMouseLeave?.(e);
        }
      })}
      {visible && createPortal(
        <div 
          className="fixed z-[9999] px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          style={{ 
            top: coords.top, 
            left: coords.left,
            transform: 'translateY(-50%)' 
          }}
        >
          {label}
          {/* Arrow */}
          <div className="absolute top-1/2 -left-1.5 -mt-1.5 border-[6px] border-transparent border-r-gray-900" />
        </div>,
        document.body
      )}
    </>
  );
};

interface SortableProjectItemProps {
  project: Project;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent, project: Project) => void;
  onMenuTrigger: (e: React.MouseEvent, project: Project) => void;
}

// -- Sortable Project Item Component --
const SortableProjectItem: React.FC<SortableProjectItemProps> = ({ 
  project, 
  isActive, 
  isCollapsed, 
  onClick, 
  onContextMenu,
  onMenuTrigger
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as 'relative',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <SidebarTooltip label={project.name} show={isCollapsed}>
      <div 
        ref={setNodeRef} 
        style={style} 
        className="group relative flex items-center mb-0.5 px-2"
        onContextMenu={(e) => onContextMenu(e, project)}
      >
        <Link
          to={`/admin/project/${project.id}/inventory`.replace('/admin', isActive && window.location.hash.includes('user') ? '/user' : window.location.hash.includes('user') ? '/user' : '/admin')}
          onClick={onClick}
          className={`flex-1 flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-all duration-200 ${
            isActive 
              ? 'bg-gray-100 text-gray-900 font-medium' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          } ${isCollapsed ? 'justify-center' : ''}`}
        >
          <Building2 size={16} className={`shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`} />
          {!isCollapsed && (
            <span className="truncate flex-1">{project.name}</span>
          )}
        </Link>

        {!isCollapsed && (
          <div className="absolute right-3 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div {...attributes} {...listeners} className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
              <GripVertical size={12} />
            </div>
            <button 
              onClick={(e) => onMenuTrigger(e, project)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        )}
      </div>
    </SidebarTooltip>
  );
};

// -- Main Sidebar Component --

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, updateUserData } = useAuth();
  const { lastUpdate, triggerUpdate } = useProjectContext();
  const location = useLocation();
  const path = location.pathname;

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem('otrack_sidebar_collapsed');
    return savedState === 'true';
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [menuConfig, setMenuConfig] = useState<{ isOpen: boolean; x: number; y: number; project: Project | null; }>({ isOpen: false, x: 0, y: 0, project: null });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', address: '', status: 'active' as any });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('otrack_sidebar_collapsed', String(newState));
      return newState;
    });
  };

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      try {
        let data: Project[] = [];
        if (user.role === 'admin') {
          data = await getProjects();
        } else {
          data = await getProjectsForUser(user.assignedProjects);
        }

        if (user.projectOrder && user.projectOrder.length > 0) {
          data.sort((a, b) => {
            const indexA = user.projectOrder!.indexOf(a.id);
            const indexB = user.projectOrder!.indexOf(b.id);
            const valA = indexA === -1 ? 9999 : indexA;
            const valB = indexB === -1 ? 9999 : indexB;
            return valA - valB;
          });
        }
        setProjects(data);
      } catch (error) {
        console.error("Error fetching sidebar projects", error);
      }
    };
    fetchProjects();
  }, [user, lastUpdate]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setProjects((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        if (user) {
           const idOrder = newOrder.map(p => p.id);
           updateUserProjectOrder(user.uid, idOrder);
           updateUserData({ projectOrder: idOrder });
        }
        return newOrder;
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    setMenuConfig({ isOpen: true, x: e.clientX, y: e.clientY, project });
  };

  const handleMenuTrigger = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuConfig({ isOpen: true, x: rect.right + 5, y: rect.top, project });
  };

  const closeMenu = () => setMenuConfig({ ...menuConfig, isOpen: false });

  const handleEditClick = () => {
    if (!menuConfig.project) return;
    setActiveProject(menuConfig.project);
    setEditFormData({ name: menuConfig.project.name, address: menuConfig.project.address, status: menuConfig.project.status });
    setEditModalOpen(true);
    closeMenu();
  };

  const handleDownloadClick = async () => {
    if (!menuConfig.project) return;
    try {
      const inventory = await getInventory(menuConfig.project.id);
      exportProjectInventoryToExcel(menuConfig.project, inventory);
    } catch (e) {
      console.error(e);
      alert('Erro ao baixar planilha.');
    }
    closeMenu();
  };

  const handleDeleteClick = () => {
    if (!menuConfig.project) return;
    setActiveProject(menuConfig.project);
    setDeleteModalOpen(true);
    closeMenu();
  };

  const saveProjectEdit = async () => {
    if (!activeProject) return;
    await updateProject(activeProject.id, editFormData);
    setEditModalOpen(false);
    triggerUpdate();
  };

  const confirmDelete = async () => {
    if (!activeProject) return;
    await deleteProject(activeProject.id);
    setDeleteModalOpen(false);
    triggerUpdate();
  };

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Gerenciar Usuários', icon: Users },
    { href: '/admin/history', label: 'Histórico Global', icon: History },
  ];

  const userLinks = [
    { href: '/user/dashboard', label: 'Minhas Obras', icon: FolderKanban },
    { href: '/user/history', label: 'Meu Histórico', icon: History },
  ];

  const mainLinks = user?.role === 'admin' ? adminLinks : userLinks;

  return (
    <>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      {isOpen && <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 transform bg-white transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] border-r border-gray-200 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:static lg:translate-x-0 
          ${isCollapsed ? 'w-[70px]' : 'w-[240px]'}
          flex flex-col h-full max-h-screen
        `}
        onContextMenu={(e) => e.preventDefault()}
      >
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex absolute -right-3 top-[76px] z-50 h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`flex h-[88px] items-center ${isCollapsed ? 'justify-center' : 'px-5 justify-between'} border-b border-gray-200 relative bg-white flex-shrink-0 transition-all duration-300`}>
          <div className="flex items-center gap-2.5 text-primary transition-all duration-300">
            <div className="bg-gray-900 text-white p-1.5 rounded-lg">
              <Box className="w-5 h-5 shrink-0" />
            </div>
            <span className={`font-bold text-lg tracking-tight text-gray-900 overflow-hidden transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              OTrack
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 lg:hidden"><X size={20} /></button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden pt-6">
          <nav className="space-y-0.5 px-2 flex-shrink-0 mb-6">
            {mainLinks.map((link) => (
              <SidebarTooltip key={link.href} label={link.label} show={isCollapsed}>
                <Link
                  to={link.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                    path === link.href 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <link.icon size={18} className="shrink-0" />
                  <span className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                    {link.label}
                  </span>
                </Link>
              </SidebarTooltip>
            ))}
          </nav>

          <div className="px-4 pb-2 flex-shrink-0">
            {!isCollapsed && (
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Obras
              </h3>
            )}
            {isCollapsed && <div className="h-px w-8 mx-auto bg-gray-200 mb-2"></div>}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-2 min-h-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy} disabled={isCollapsed}>
                {projects.map((project) => (
                  <SortableProjectItem
                    key={project.id}
                    project={project}
                    isActive={path.includes(`/project/${project.id}`)}
                    isCollapsed={isCollapsed}
                    onClick={onClose}
                    onContextMenu={handleContextMenu}
                    onMenuTrigger={handleMenuTrigger}
                  />
                ))}
              </SortableContext>
            </DndContext>
            
            {projects.length === 0 && !isCollapsed && (
              <p className="px-2 text-xs text-gray-400 italic">Nenhuma obra.</p>
            )}
          </div>
          
          <div className="p-2 border-t border-gray-100 flex-shrink-0 bg-white z-10">
             <SidebarTooltip label="Configurações" show={isCollapsed}>
               <Link
                  to="/settings"
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
               >
                  <Settings size={18} className="shrink-0" />
                  {!isCollapsed && <span className="font-medium">Configurações</span>}
               </Link>
             </SidebarTooltip>
          </div>
        </div>
      </aside>

      {menuConfig.isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={closeMenu} onContextMenu={(e) => { e.preventDefault(); closeMenu(); }}></div>
          <div 
            className="fixed z-[101] w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 overflow-hidden ring-1 ring-black ring-opacity-5"
            style={{ 
              top: Math.min(menuConfig.y, window.innerHeight - 150), 
              left: Math.min(menuConfig.x, window.innerWidth - 200) 
            }}
          >
            {user?.role === 'admin' && (
              <button onClick={handleEditClick} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <Pencil size={14} /> Editar
              </button>
            )}
            <button onClick={handleDownloadClick} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <Download size={14} /> Baixar Planilha
            </button>
            {user?.role === 'admin' && (
              <button onClick={handleDeleteClick} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-50 mt-1">
                <Trash2 size={14} /> Excluir
              </button>
            )}
          </div>
        </>,
        document.body
      )}

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Obra"
        footer={<><Button variant="ghost" onClick={() => setEditModalOpen(false)}>Cancelar</Button><Button onClick={saveProjectEdit}>Salvar</Button></>}>
        <div className="space-y-4">
          <Input label="Nome" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
          <Input label="Endereço" value={editFormData.address} onChange={e => setEditFormData({...editFormData, address: e.target.value})} />
          <Select label="Status" value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value as any})}
            options={[{ label: 'Em Andamento', value: 'active' }, { label: 'Pausado', value: 'paused' }, { label: 'Concluído', value: 'completed' }]} />
        </div>
      </Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Excluir Obra"
        footer={<><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button><Button variant="danger" onClick={confirmDelete}>Excluir</Button></>}>
        <p className="text-sm text-gray-600">Tem certeza que deseja excluir <b>{activeProject?.name}</b>?</p>
      </Modal>
    </>
  );
};

export default Sidebar;
