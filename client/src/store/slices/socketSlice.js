import { createSlice } from '@reduxjs/toolkit';
import io from 'socket.io-client';

const initialState = {
  socket: null,
  isConnected: false,
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setSocket: (state, action) => {
      state.socket = action.payload;
      state.isConnected = true;
    },
    disconnectSocket: (state) => {
      if (state.socket) {
        state.socket.disconnect();
      }
      state.socket = null;
      state.isConnected = false;
    },
  },
});

export const { setSocket, disconnectSocket } = socketSlice.actions;

// Thunk to initialize socket connection
export const initializeSocket = () => (dispatch, getState) => {
  const { auth } = getState();
  
  if (auth.user && !getState().socket.socket) {
    const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      auth: {
        token: auth.token,
      },
    });

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    dispatch(setSocket(socket));
  }
};

export default socketSlice.reducer;