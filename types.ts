
export interface User {
  uid: string;
  email: string;
  name: string;
  roleId: string; // ID of the UserRole
  role?: 'admin' | 'user'; // Deprecated, kept for backward compatibility/super-admin check
  assignedProjects: string[]; // List of Project IDs this user can access
  projectOrder?: string[]; 
}

export interface UserRole {
  id: string;
  name: string;
  description?: string;
  permissions: {
    // Admin / Global
    view_dashboard: boolean;
    manage_users: boolean;
    manage_roles: boolean;
    manage_supplies: boolean;
    manage_projects: boolean; // Create/Delete projects
    
    // Project Specific
    access_all_projects: boolean; // If true, ignores assignedProjects
    inventory_view: boolean;
    inventory_add: boolean;
    inventory_edit: boolean;
    inventory_delete: boolean;
  }
}

export interface Project {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: number;
}

export interface InventoryItem {
  id: string;
  projectId: string;
  name: string;
  quantity: number;
  unit: string; 
  minQuantity?: number;
  category: string;
  lastUpdated: number;
  lastUpdatedBy: string;
  unitPrice?: number;
}

export interface InventoryLog {
  id: string;
  itemId: string;
  itemName: string; 
  projectId: string;
  projectName: string; 
  userId: string;
  userEmail: string;
  type: 'in' | 'out';
  quantityChanged: number; 
  currentStock: number; 
  timestamp: number;
  notes?: string;
}

export interface Supply {
  id: string;
  name: string;
  unit: string;
  category: string;
  price?: number;
}
