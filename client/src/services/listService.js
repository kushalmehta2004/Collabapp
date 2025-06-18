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

const listService = {
  // Get lists for a board
  getListsByBoard: async (boardId) => {
    const response = await api.get(`/lists/board/${boardId}`);
    return response.data;
  },

  // Create list
  createList: async (listData) => {
    const response = await api.post('/lists', listData);
    return response.data;
  },

  // Update list
  updateList: async (listId, listData) => {
    const response = await api.put(`/lists/${listId}`, listData);
    return response.data;
  },

  // Delete list
  deleteList: async (listId) => {
    const response = await api.delete(`/lists/${listId}`);
    return response.data;
  },

  // Archive/unarchive list
  archiveList: async (listId) => {
    const response = await api.put(`/lists/${listId}/archive`);
    return response.data;
  },

  // Reorder lists
  reorderLists: async (boardId, listIds) => {
    const response = await api.put('/lists/reorder', { boardId, listIds });
    return response.data;
  },

  // Create task in list
  createTask: async (listId, taskData) => {
    const response = await api.post(`/lists/${listId}/tasks`, taskData);
    return response.data;
  },

  // Get archived lists for a board
  getArchivedLists: async (boardId) => {
    const response = await api.get(`/lists/board/${boardId}/archived`);
    return response.data;
  },
};

export default listService;