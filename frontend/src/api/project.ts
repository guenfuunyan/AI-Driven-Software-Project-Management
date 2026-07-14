import { apiClient } from './client';
import { Project } from '../store/projectStore';

export const ProjectService = {
  getProjects: async (): Promise<Project[]> => {
    const response = await apiClient.get<Project[]>('/api/projects');
    return response.data;
  },
  getProject: async (id: number): Promise<Project> => {
    const response = await apiClient.get<Project>(`/api/projects/${id}`);
    return response.data;
  },
  createProject: async (data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.post<Project>('/api/projects', data);
    return response.data;
  },
};
