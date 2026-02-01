
import * as XLSX from 'xlsx';
import { InventoryItem, Project } from '../types';

export const exportProjectInventoryToExcel = (project: Project, inventory: InventoryItem[]) => {
  // Format data for Excel
  const data = inventory.map(item => ({
    'Nome do Item': item.name,
    'Categoria': item.category,
    'Quantidade': item.quantity,
    'Unidade': item.unit,
    'Última Atualização': new Date(item.lastUpdated).toLocaleDateString() + ' ' + new Date(item.lastUpdated).toLocaleTimeString(),
    'Atualizado Por': item.lastUpdatedBy
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  const wscols = [
    {wch: 30}, // Nome
    {wch: 20}, // Categoria
    {wch: 15}, // Qtd
    {wch: 10}, // Unidade
    {wch: 25}, // Data
    {wch: 25}  // Usuario
  ];
  ws['!cols'] = wscols;

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Estoque");

  // Generate file name
  const cleanName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileName = `estoque_${cleanName}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Write file
  XLSX.writeFile(wb, fileName);
};
