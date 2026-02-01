
import React, { useEffect, useState } from 'react';
import { useAuth } from '../services/authContext';
import { getInventoryLogs } from '../services/firestoreService';
import { InventoryLog } from '../types';
import { History, ArrowUpCircle, ArrowDownCircle, Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const InventoryHistory: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filters State
  const [searchTerm, setSearchTerm] = useState(''); // General Search (Item/Project/User)
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterProject, setFilterProject] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const fetchLogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getInventoryLogs(user);
      setLogs(data);
    } catch (error) {
      console.error("Error fetching logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateStart, dateEnd, filterType, filterProject, filterUser]);

  const clearFilters = () => {
    setSearchTerm('');
    setDateStart('');
    setDateEnd('');
    setFilterType('all');
    setFilterProject('');
    setFilterUser('');
  };

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    
    // 1. General Search (Matches almost anything)
    const itemMatch = (log.itemName || '').toLowerCase().includes(term);
    const projectMatchGeneral = (log.projectName || '').toLowerCase().includes(term);
    const userMatchGeneral = (log.userEmail || '').toLowerCase().includes(term);
    const generalMatch = itemMatch || projectMatchGeneral || userMatchGeneral;
    
    if (!showFilters) {
       // If filters are hidden, rely solely on the main search bar
       return term === '' ? true : generalMatch;
    }

    // 2. Specific Field Filters (Only applied if Show Filters is ON)
    const projectMatch = filterProject 
      ? (log.projectName || '').toLowerCase().includes(filterProject.toLowerCase())
      : true;
      
    const userMatch = filterUser
      ? (log.userEmail || '').toLowerCase().includes(filterUser.toLowerCase())
      : true;

    const typeMatch = filterType === 'all' 
      ? true 
      : log.type === filterType;

    // Date Range Filter
    let dateMatch = true;
    const logDate = new Date(log.timestamp);
    
    if (dateStart) {
      const start = new Date(dateStart);
      // Fix timezone offset for simplified day comparison logic
      start.setHours(0,0,0,0); 
      if (logDate < start) dateMatch = false;
    }

    if (dateEnd && dateMatch) {
       const end = new Date(dateEnd);
       end.setHours(23, 59, 59, 999);
       if (logDate > end) dateMatch = false;
    }

    return (term === '' || generalMatch) && projectMatch && userMatch && typeMatch && dateMatch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Movimentações</h1>
          <p className="text-gray-500">
            Monitoramento de fluxo de materiais e auditoria.
          </p>
        </div>
        
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
           <div className="relative flex-1 w-full">
             <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
             <input 
               type="text"
               placeholder="Buscar item, obra ou usuário..."
               className="pl-9 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-colors"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>

           <div className="flex gap-2 w-full md:w-auto">
             <Button 
               variant={showFilters ? 'primary' : 'outline'} 
               onClick={() => setShowFilters(!showFilters)}
               className="flex-1 md:flex-none whitespace-nowrap"
             >
               <Filter size={16} className="mr-2" />
               {showFilters ? 'Ocultar Filtros' : 'Filtros Avançados'}
             </Button>
           </div>
        </div>

        {/* Expandable Filters Section */}
        {showFilters && (
          <Card className="p-4 bg-gray-50 border-none animate-in fade-in slide-in-from-top-2 duration-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Filtros Detalhados</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Obra</label>
                <Input 
                   placeholder="Nome da obra"
                   value={filterProject}
                   onChange={(e) => setFilterProject(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Usuário</label>
                <Input 
                   placeholder="Email do usuário"
                   value={filterUser}
                   onChange={(e) => setFilterUser(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo de Movimento</label>
                <select 
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[38px]"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="in">Entradas (+)</option>
                  <option value="out">Saídas (-)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data Inicial</label>
                <Input 
                  type="date" 
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data Final</label>
                <Input 
                  type="date" 
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
              <Button 
                variant="ghost" 
                onClick={clearFilters} 
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X size={16} className="mr-2" /> Limpar Filtros
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Card className="overflow-hidden p-0 border border-gray-200 shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data / Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obra</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    Carregando histórico...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <History className="h-8 w-8 text-gray-300 mb-2" />
                      <p>Nenhum registro encontrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                        <span className="text-xs">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {log.projectName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.itemName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.type === 'in' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.type === 'in' ? (
                          <><ArrowUpCircle size={12} className="mr-1" /> Entrada</>
                        ) : (
                          <><ArrowDownCircle size={12} className="mr-1" /> Saída</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {log.type === 'in' ? '+' : '-'}{log.quantityChanged}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {log.currentStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                         <span className="font-medium">{(log.userEmail || '').split('@')[0]}</span>
                         <span className="text-xs text-gray-400 max-w-[150px] truncate" title={log.userEmail}>{log.userEmail || 'N/A'}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredLogs.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
             <div className="text-sm text-gray-500">
               Mostrando <span className="font-medium">{startIndex + 1}</span> até <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredLogs.length)}</span> de <span className="font-medium">{filteredLogs.length}</span> resultados
             </div>
             
             <div className="flex gap-2">
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={goToPrevPage} 
                 disabled={currentPage === 1}
                 className="px-2"
               >
                 <ChevronLeft size={16} />
               </Button>
               <div className="flex items-center px-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md">
                 {currentPage} / {totalPages}
               </div>
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={goToNextPage} 
                 disabled={currentPage === totalPages}
                 className="px-2"
               >
                 <ChevronRight size={16} />
               </Button>
             </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default InventoryHistory;
