
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
import { Project, User, InventoryItem, InventoryLog } from "../types";

// --- Users ---

export const createUser = async (userData: Omit<User, 'uid'>) => {
  // In a real app with Firebase Auth, you'd create the Auth user first.
  // Here we just store the user profile in Firestore for our custom logic.
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
  // Using setDoc with merge: true ensures that if the user (e.g. bootstrap admin) 
  // doesn't fully exist in 'users' collection yet, the preference is still saved 
  // without erroring out, preserving other fields if they exist.
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
  if (projectIds.length === 0) return [];
  // Firestore 'in' query supports up to 10 items. For simplicity here assuming < 10.
  // In production, we'd loop or fetch all and filter client side if list is huge.
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
  
  // Log the creation if quantity > 0 and context is provided
  if (item.quantity > 0 && projectName && user) {
    await addDoc(collection(db, "inventory_logs"), {
      itemId: docRef.id,
      itemName: item.name,
      projectId: item.projectId,
      projectName: projectName,
      userId: user.uid,
      userEmail: user.email,
      type: 'in', // Initial stock is considered 'in'
      quantityChanged: item.quantity,
      currentStock: item.quantity,
      timestamp: Date.now(),
      notes: 'Estoque inicial'
    });
  }

  return { ...item, id: docRef.id };
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

// --- Logs / History ---

export const getInventoryLogs = async (user: User): Promise<InventoryLog[]> => {
  let q;
  
  if (user.role === 'admin') {
    // Admin sees all logs, ordered by newest. 
    // Increased limit to support filtering better on client side for this demo
    q = query(collection(db, "inventory_logs"), orderBy("timestamp", "desc"), limit(200));
  } else {
    // User sees logs only for assigned projects
    if (user.assignedProjects.length === 0) return [];
    
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

  // Firestore allows max 500 operations per batch. 
  // We handle this by chunking the deletes.
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
