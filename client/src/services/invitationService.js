import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Create axios instance with auth header
const createAuthRequest = () => {
  const token = getAuthToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

const invitationService = {
  // Get all invitations for the current user
  getInvitations: async () => {
    try {
      const response = await axios.get(`${API_URL}/invitations/received`, createAuthRequest());
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Accept an invitation
  acceptInvitation: async (invitationId) => {
    try {
      const response = await axios.put(
        `${API_URL}/invitations/${invitationId}/accept`,
        {},
        createAuthRequest()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Decline an invitation
  declineInvitation: async (invitationId) => {
    try {
      const response = await axios.put(
        `${API_URL}/invitations/${invitationId}/decline`,
        {},
        createAuthRequest()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Send an invitation (already implemented in Board.js, but adding here for completeness)
  sendInvitation: async (boardId, username, role = 'member') => {
    try {
      const response = await axios.post(
        `${API_URL}/invitations`,
        { boardId, username, role },
        createAuthRequest()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default invitationService;