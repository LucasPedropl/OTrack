
import React, { createContext, useContext, useState, useCallback } from 'react';

// Context to notify components (like Sidebar) that project data has changed
// and they should re-fetch their lists.

interface ProjectContextType {
  lastUpdate: number;
  triggerUpdate: () => void;
}

const ProjectContext = createContext<ProjectContextType>({
  lastUpdate: 0,
  triggerUpdate: () => {},
});

export const useProjectContext = () => useContext(ProjectContext);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const triggerUpdate = useCallback(() => {
    setLastUpdate(Date.now());
  }, []);

  return (
    <ProjectContext.Provider value={{ lastUpdate, triggerUpdate }}>
      {children}
    </ProjectContext.Provider>
  );
};
