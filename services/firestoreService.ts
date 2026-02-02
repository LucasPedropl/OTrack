
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  getDoc,
  orderBy,
  limit,
  writeBatch,
  setDoc
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { Project, User, InventoryItem, InventoryLog, Supply, UserRole } from "../types";

// --- Roles (Tipos de Usuário) ---

export const getRoles = async (): Promise<UserRole[]> => {
  const querySnapshot = await getDocs(collection(db, "roles"));
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as UserRole));
};

export const createRole = async (roleData: Omit<UserRole, 'id'>) => {
  const docRef = await addDoc(collection(db, "roles"), roleData);
  return { ...roleData, id: docRef.id };
};

export const updateRole = async (id: string, data: Partial<UserRole>) => {
  const ref = doc(db, "roles", id);
  await updateDoc(ref, data);
};

export const deleteRole = async (id: string) => {
  await deleteDoc(doc(db, "roles", id));
};

export const getRoleById = async (id: string): Promise<UserRole | null> => {
  const docRef = doc(db, "roles", id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { ...docSnap.data(), id: docSnap.id } as UserRole;
};

// --- Users ---

export const createUser = async (userData: Omit<User, 'uid'>) => {
  // In a real app with Firebase Auth, you'd create the Auth user first.
  const docRef = await addDoc(collection(db, "users"), userData);
  return { ...userData, uid: docRef.id };
};

export const getUsers = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(d => ({ ...d.data(), uid: d.id } as User));
};

export const updateUser = async (uid: string, data: Partial<User>) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, data);
};

export const updateUserProjectOrder = async (uid: string, projectOrder: string[]) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { projectOrder }, { merge: true });
};

export const deleteUser = async (uid: string) => {
  await deleteDoc(doc(db, "users", uid));
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const q = query(collection(db, "users"), where("email", "==", email));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const docData = querySnapshot.docs[0];
  return { ...docData.data(), uid: docData.id } as User;
};

// --- Projects ---

export const createProject = async (projectData: Omit<Project, 'id'>) => {
  const docRef = await addDoc(collection(db, "projects"), {
    ...projectData,
    createdAt: Date.now()
  });
  return { ...projectData, id: docRef.id };
};

export const getProjects = async (): Promise<Project[]> => {
  const querySnapshot = await getDocs(collection(db, "projects"));
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Project));
};

export const getProjectById = async (id: string): Promise<Project | null> => {
  const docRef = doc(db, "projects", id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { ...docSnap.data(), id: docSnap.id } as Project;
};

export const getProjectsForUser = async (projectIds: string[]): Promise<Project[]> => {
  if (!projectIds || projectIds.length === 0) return [];
  // Firestore 'in' query supports up to 10 items.
  const q = query(collection(db, "projects"), where("__name__", "in", projectIds));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Project));
};

export const updateProject = async (id: string, data: Partial<Project>) => {
  const ref = doc(db, "projects", id);
  await updateDoc(ref, data);
};

export const deleteProject = async (id: string) => {
  await deleteDoc(doc(db, "projects", id));
};

// --- Inventory ---

export const getInventory = async (projectId: string): Promise<InventoryItem[]> => {
  const q = query(collection(db, "inventory"), where("projectId", "==", projectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as InventoryItem));
};

// Updated signature to support logging on creation
export const addInventoryItem = async (
  item: Omit<InventoryItem, 'id'>, 
  projectName?: string, 
  user?: User
) => {
  const docRef = await addDoc(collection(db, "inventory"), item);
  
  if (item.quantity > 0 && projectName && user) {
    await addDoc(collection(db, "inventory_logs"), {
      itemId: docRef.id,
      itemName: item.name,
      projectId: item.projectId,
      projectName: projectName,
      userId: user.uid,
      userEmail: user.email,
      type: 'in', 
      quantityChanged: item.quantity,
      currentStock: item.quantity,
      timestamp: Date.now(),
      notes: 'Estoque inicial'
    });
  }

  return { ...item, id: docRef.id };
};

// Generic update for item details (not just quantity)
export const updateInventoryItem = async (id: string, data: Partial<InventoryItem>) => {
  const itemRef = doc(db, "inventory", id);
  await updateDoc(itemRef, data);
};

export const updateInventoryQuantity = async (
  itemId: string, 
  itemName: string,
  newQuantity: number, 
  user: User, 
  projectId: string,
  projectName: string,
  type: 'in' | 'out',
  amountChanged: number
) => {
  const itemRef = doc(db, "inventory", itemId);
  await updateDoc(itemRef, {
    quantity: newQuantity,
    lastUpdated: Date.now(),
    lastUpdatedBy: user.email
  });

  // Log the transaction
  await addDoc(collection(db, "inventory_logs"), {
    itemId,
    itemName,
    projectId,
    projectName,
    userId: user.uid,
    userEmail: user.email,
    type,
    quantityChanged: amountChanged,
    currentStock: newQuantity,
    timestamp: Date.now()
  });
};

export const deleteInventoryItem = async (id: string) => {
  await deleteDoc(doc(db, "inventory", id));
};

// --- Supplies (Catálogo Global) ---

export const getSupplies = async (): Promise<Supply[]> => {
  const q = query(collection(db, "supplies"), orderBy("name"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Supply));
};

export const addSupply = async (supply: Omit<Supply, 'id'>) => {
  const docRef = await addDoc(collection(db, "supplies"), supply);
  return { ...supply, id: docRef.id };
};

export const updateSupply = async (id: string, data: Partial<Supply>) => {
  const ref = doc(db, "supplies", id);
  await updateDoc(ref, data);
};

export const deleteSupply = async (id: string) => {
  await deleteDoc(doc(db, "supplies", id));
};

// --- Logs / History ---

export const getInventoryLogs = async (user: User): Promise<InventoryLog[]> => {
  let q;
  
  if (user.role === 'admin') { // Or check permissions
    q = query(collection(db, "inventory_logs"), orderBy("timestamp", "desc"), limit(200));
  } else {
    if (!user.assignedProjects || user.assignedProjects.length === 0) return [];
    
    q = query(
      collection(db, "inventory_logs"), 
      where("projectId", "in", user.assignedProjects),
      orderBy("timestamp", "desc"),
      limit(100)
    );
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as InventoryLog));
};

export const clearAllLogs = async () => {
  const q = query(collection(db, "inventory_logs"));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return;

  const CHUNK_SIZE = 500;
  for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const chunk = snapshot.docs.slice(i, i + CHUNK_SIZE);
    
    chunk.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }
};
