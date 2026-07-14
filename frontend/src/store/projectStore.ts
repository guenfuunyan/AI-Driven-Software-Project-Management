import { create } from 'zustand';
import { ProjectService } from '../api/project';

export interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  fetchProjects: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await ProjectService.getProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to fetch projects', error);
    }
  },

  createProject: async (data: Partial<Project>) => {
    set({ isLoading: true });
    try {
      const newProject = await ProjectService.createProject(data);
      set((state) => ({ projects: [...state.projects, newProject], isLoading: false }));
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to create project', error);
      throw error;
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),
  setLoading: (isLoading) => set({ isLoading }),
}));
