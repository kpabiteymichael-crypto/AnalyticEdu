import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { teamsApi } from '../lib/api';
import { useAuth } from './AuthContext';

interface ClassContextType {
  activeClassId: number | null;
  activeClass: any | null;
  classes: any[];
  setActiveClassId: (id: number | null) => void;
  refresh: () => Promise<void>;
  loading: boolean;
}

const ClassContext = createContext<ClassContextType>({
  activeClassId: null,
  activeClass: null,
  classes: [],
  setActiveClassId: () => {},
  refresh: async () => {},
  loading: false,
});

export function ClassProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeClassId, setActiveClassIdState] = useState<number | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) return;
    setLoading(true);
    try {
      const c = await teamsApi.list();
      setClasses(c);
      const saved = localStorage.getItem('edu_active_class');
      const savedId = saved ? parseInt(saved) : null;
      if (savedId && c.find((x: any) => x.id === savedId)) {
        setActiveClassIdState(savedId);
      } else if (c.length > 0 && !activeClassId) {
        setActiveClassIdState(c[0].id);
        localStorage.setItem('edu_active_class', String(c[0].id));
      }
    } catch { }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [user]);

  const setActiveClassId = (id: number | null) => {
    setActiveClassIdState(id);
    if (id) localStorage.setItem('edu_active_class', String(id));
    else localStorage.removeItem('edu_active_class');
  };

  const activeClass = classes.find(c => c.id === activeClassId) ?? null;

  return (
    <ClassContext.Provider value={{ activeClassId, activeClass, classes, setActiveClassId, refresh: load, loading }}>
      {children}
    </ClassContext.Provider>
  );
}

export const useClass = () => useContext(ClassContext);
