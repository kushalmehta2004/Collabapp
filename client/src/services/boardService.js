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

const boardService = {
  // Get all boards
  getBoards: async () => {
    const response = await api.get('/boards');
    return response.data;
  },

  // Get single board
  getBoard: async (boardId) => {
    const response = await api.get(`/boards/${boardId}`);
    return response.data;
  },

  // Create board
  createBoard: async (boardData) => {
    const response = await api.post('/boards', boardData);
    return response.data;
  },

  // Update board
  updateBoard: async (boardId, boardData) => {
    const response = await api.put(`/boards/${boardId}`, boardData);
    return response.data;
  },

  // Delete board
  deleteBoard: async (boardId) => {
    const response = await api.delete(`/boards/${boardId}`);
    return response.data;
  },

  // Add member to board
  addMember: async (boardId, memberData) => {
    const response = await api.post(`/boards/${boardId}/members`, memberData);
    return response.data;
  },

  // Remove member from board
  removeMember: async (boardId, userId) => {
    const response = await api.delete(`/boards/${boardId}/members/${userId}`);
    return response.data;
  },

  // Update member role
  updateMemberRole: async (boardId, userId, role) => {
    const response = await api.put(`/boards/${boardId}/members/${userId}`, { role });
    return response.data;
  },
};

export default boardService;