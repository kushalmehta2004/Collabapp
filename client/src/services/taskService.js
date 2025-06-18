import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const taskService = {
  // Get task by ID
  getTask: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  // Update task
  updateTask: async (taskId, taskData) => {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
  },

  // Delete task
  deleteTask: async (taskId) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },

  // Move task between lists
  moveTask: async (taskId, sourceListId, destinationListId, newPosition) => {
    const response = await api.put(`/tasks/${taskId}/move`, {
      sourceListId,
      destinationListId,
      newPosition
    });
    return response.data;
  },

  // Reorder tasks within a list
  reorderTasks: async (listId, taskIds) => {
    const response = await api.put(`/tasks/reorder`, { listId, taskIds });
    return response.data;
  },

  // Add comment to task
  addComment: async (taskId, comment) => {
    const response = await api.post(`/tasks/${taskId}/comments`, { text: comment });
    return response.data;
  },

  // Update task checklist
  updateChecklist: async (taskId, checklistData) => {
    const response = await api.put(`/tasks/${taskId}/checklist`, checklistData);
    return response.data;
  },

  // Assign user to task
  assignUser: async (taskId, userId) => {
    const response = await api.post(`/tasks/${taskId}/assign`, { userId });
    return response.data;
  },

  // Unassign user from task
  unassignUser: async (taskId, userId) => {
    const response = await api.delete(`/tasks/${taskId}/assign/${userId}`);
    return response.data;
  },

  // Toggle task completion
  toggleTaskCompletion: async (taskId, isCompleted) => {
    const response = await api.put(`/tasks/${taskId}`, { isCompleted });
    return response.data;
  },
};

export default taskService;