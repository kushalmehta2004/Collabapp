import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import boardService from '../../services/boardService';

const initialState = {
  boards: [],
  currentBoard: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchBoards = createAsyncThunk(
  'boards/fetchBoards',
  async (_, { rejectWithValue }) => {
    try {
      const response = await boardService.getBoards();
      return response.boards;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch boards');
    }
  }
);

export const createBoard = createAsyncThunk(
  'boards/createBoard',
  async (boardData, { rejectWithValue }) => {
    try {
      const response = await boardService.createBoard(boardData);
      return response.board;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create board');
    }
  }
);

export const fetchBoard = createAsyncThunk(
  'boards/fetchBoard',
  async (boardId, { rejectWithValue }) => {
    try {
      const response = await boardService.getBoard(boardId);
      return response.board;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch board');
    }
  }
);

export const deleteBoard = createAsyncThunk(
  'boards/deleteBoard',
  async (boardId, { rejectWithValue }) => {
    try {
      await boardService.deleteBoard(boardId);
      return boardId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete board');
    }
  }
);

const boardSlice = createSlice({
  name: 'boards',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentBoard: (state, action) => {
      state.currentBoard = action.payload;
    },
    clearCurrentBoard: (state) => {
      state.currentBoard = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch boards
      .addCase(fetchBoards.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.isLoading = false;
        state.boards = action.payload;
      })
      .addCase(fetchBoards.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create board
      .addCase(createBoard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBoard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.boards.unshift(action.payload);
      })
      .addCase(createBoard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch board
      .addCase(fetchBoard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBoard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentBoard = action.payload;
      })
      .addCase(fetchBoard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Delete board
      .addCase(deleteBoard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteBoard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.boards = state.boards.filter(board => board._id !== action.payload);
        // Clear current board if it was deleted
        if (state.currentBoard && state.currentBoard._id === action.payload) {
          state.currentBoard = null;
        }
      })
      .addCase(deleteBoard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setCurrentBoard, clearCurrentBoard } = boardSlice.actions;
export default boardSlice.reducer;