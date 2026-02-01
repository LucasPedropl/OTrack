
export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  assignedProjects: string[]; // List of Project IDs this user can access
  projectOrder?: string[]; // Preference for sidebar order
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
  unit: string; // e.g., 'kg', 'm2', 'unid'
  minQuantity?: number;
  category: string;
  lastUpdated: number;
  lastUpdatedBy: string;
}

export interface InventoryLog {
  id: string;
  itemId: string;
  itemName: string; // Added for display history
  projectId: string;
  projectName: string; // Added for display history
  userId: string;
  userEmail: string;
  type: 'in' | 'out';
  quantityChanged: number; // The amount added or removed
  currentStock: number; // The stock level AFTER the change
  timestamp: number;
  notes?: string;
}
