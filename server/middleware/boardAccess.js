const Board = require('../models/Board');

// Middleware to check if user has access to a board
const checkBoardAccess = (requiredRole = 'member') => {
  return async (req, res, next) => {
    try {
      const boardId = req.params.boardId || req.params.id;
      const userId = req.user._id;

      if (!boardId) {
        return res.status(400).json({ 
          message: 'Board ID is required' 
        });
      }

      // Find the board
      const board = await Board.findById(boardId);
      
      if (!board) {
        return res.status(404).json({ 
          message: 'Board not found' 
        });
      }

      // Check if board is archived
      if (board.isArchived) {
        return res.status(403).json({ 
          message: 'Board is archived' 
        });
      }

      // Check if user has access to the board
      const userRole = board.getUserRole(userId);
      
      if (!userRole) {
        return res.status(403).json({ 
          message: 'Access denied - you are not a member of this board' 
        });
      }

      // Check role permissions
      const roleHierarchy = {
        'viewer': 1,
        'member': 2,
        'admin': 3,
        'owner': 4
      };

      const requiredLevel = roleHierarchy[requiredRole] || 1;
      const userLevel = roleHierarchy[userRole] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          message: `Access denied - ${requiredRole} role required` 
        });
      }

      // Add board and user role to request
      req.board = board;
      req.userRole = userRole;
      
      next();
    } catch (error) {
      console.error('Board access middleware error:', error);
      res.status(500).json({ 
        message: 'Server error checking board access' 
      });
    }
  };
};

// Middleware to check if user owns the board
const checkBoardOwnership = async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.params.id;
    const userId = req.user._id;

    const board = await Board.findById(boardId);
    
    if (!board) {
      return res.status(404).json({ 
        message: 'Board not found' 
      });
    }

    if (board.owner.toString() !== userId.toString()) {
      return res.status(403).json({ 
        message: 'Access denied - only board owner can perform this action' 
      });
    }

    req.board = board;
    next();
  } catch (error) {
    console.error('Board ownership middleware error:', error);
    res.status(500).json({ 
      message: 'Server error checking board ownership' 
    });
  }
};

// Middleware to check if board is public or user has access
const checkBoardVisibility = async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.params.id;
    const userId = req.user?._id;

    const board = await Board.findById(boardId);
    
    if (!board) {
      return res.status(404).json({ 
        message: 'Board not found' 
      });
    }

    // If board is public, allow access
    if (!board.isPrivate) {
      req.board = board;
      req.userRole = userId ? board.getUserRole(userId) || 'viewer' : 'viewer';
      return next();
    }

    // If board is private, check membership
    if (!userId || !board.isMember(userId)) {
      return res.status(403).json({ 
        message: 'Access denied - this is a private board' 
      });
    }

    req.board = board;
    req.userRole = board.getUserRole(userId);
    next();
  } catch (error) {
    console.error('Board visibility middleware error:', error);
    res.status(500).json({ 
      message: 'Server error checking board visibility' 
    });
  }
};

// Middleware to check if user can delete the board (owner or admin)
const checkBoardDeletionAccess = async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.params.id;
    const userId = req.user._id;

    const board = await Board.findById(boardId);
    
    if (!board) {
      return res.status(404).json({ 
        message: 'Board not found' 
      });
    }

    const userRole = board.getUserRole(userId);
    
    // Allow owners and admins to delete
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied - only board owners and admins can delete boards' 
      });
    }

    req.board = board;
    req.userRole = userRole;
    next();
  } catch (error) {
    console.error('Board deletion access middleware error:', error);
    res.status(500).json({ 
      message: 'Server error checking board deletion access' 
    });
  }
};

module.exports = {
  checkBoardAccess,
  checkBoardOwnership,
  checkBoardVisibility,
  checkBoardDeletionAccess
};