const express = require('express');
const { body, validationResult } = require('express-validator');
const List = require('../models/List');
const Task = require('../models/Task');
const Board = require('../models/Board');
const { auth } = require('../middleware/auth');
const { checkBoardAccess } = require('../middleware/boardAccess');

const router = express.Router();

// @route   POST /api/lists
// @desc    Create a new list
// @access  Private
router.post('/', [
  auth,
  body('title')
    .trim()
    .notEmpty()
    .withMessage('List title is required')
    .isLength({ max: 100 })
    .withMessage('List title cannot exceed 100 characters'),
  body('boardId')
    .notEmpty()
    .withMessage('Board ID is required')
    .isMongoId()
    .withMessage('Invalid board ID'),
  body('position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Position must be a non-negative integer')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, boardId, position } = req.body;

    // Check if board exists and user has access
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        message: 'Board not found'
      });
    }

    if (!board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied - you are not a member of this board'
      });
    }

    // Get next position if not provided
    const listPosition = position !== undefined ? position : await List.getNextPosition(boardId);

    // Create new list
    const list = new List({
      title,
      board: boardId,
      position: listPosition
    });

    await list.save();

    // Add list to board
    board.lists.push(list._id);
    board.addActivity(req.user._id, 'created list', `Created list "${title}"`);
    await board.save();

    // Emit real-time event
    req.io.to(boardId).emit('list-created', {
      list,
      boardId,
      userId: req.user._id
    });

    res.status(201).json({
      message: 'List created successfully',
      list
    });

  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({
      message: 'Server error creating list'
    });
  }
});

// @route   GET /api/lists/board/:boardId/archived
// @desc    Get archived lists for a board
// @access  Private
router.get('/board/:boardId/archived', auth, async (req, res) => {
  try {
    const { boardId } = req.params;

    // Check if board exists and user has access
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        message: 'Board not found'
      });
    }

    if (!board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied - you are not a member of this board'
      });
    }

    // Get archived lists with tasks
    const lists = await List.find({ 
      board: boardId, 
      isArchived: true 
    }).populate({
      path: 'tasks',
      options: { sort: { position: 1 } },
      populate: {
        path: 'assignedTo',
        select: 'username email firstName lastName avatar'
      }
    }).sort({ updatedAt: -1 });

    res.json({
      message: 'Archived lists retrieved successfully',
      lists
    });

  } catch (error) {
    console.error('Get archived lists error:', error);
    res.status(500).json({
      message: 'Server error retrieving archived lists'
    });
  }
});

// @route   GET /api/lists/board/:boardId
// @desc    Get all lists for a board
// @access  Private
router.get('/board/:boardId', auth, async (req, res) => {
  try {
    const { boardId } = req.params;

    // Check if board exists and user has access
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        message: 'Board not found'
      });
    }

    if (!board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied - you are not a member of this board'
      });
    }

    // Get lists with tasks
    const lists = await List.findByBoard(boardId);

    res.json({
      message: 'Lists retrieved successfully',
      lists
    });

  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({
      message: 'Server error retrieving lists'
    });
  }
});

// @route   PUT /api/lists/:id
// @desc    Update a list
// @access  Private
router.put('/:id', [
  auth,
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('List title cannot be empty')
    .isLength({ max: 100 })
    .withMessage('List title cannot exceed 100 characters'),
  body('position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Position must be a non-negative integer'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { title, position, color } = req.body;

    // Find list
    const list = await List.findById(id);
    if (!list) {
      return res.status(404).json({
        message: 'List not found'
      });
    }

    // Check board access
    const board = await Board.findById(list.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Update list fields
    const oldTitle = list.title;
    if (title !== undefined) list.title = title;
    if (position !== undefined) list.position = position;
    if (color !== undefined) list.color = color;

    await list.save();

    // Add activity to board
    if (title && title !== oldTitle) {
      board.addActivity(req.user._id, 'updated list', `Renamed list from "${oldTitle}" to "${title}"`);
      await board.save();
    }

    // Emit real-time event
    req.io.to(list.board.toString()).emit('list-updated', {
      list,
      boardId: list.board,
      userId: req.user._id
    });

    res.json({
      message: 'List updated successfully',
      list
    });

  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({
      message: 'Server error updating list'
    });
  }
});

// @route   DELETE /api/lists/:id
// @desc    Delete a list
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find list
    const list = await List.findById(id);
    if (!list) {
      return res.status(404).json({
        message: 'List not found'
      });
    }

    // Check board access
    const board = await Board.findById(list.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Check if user has admin role
    const userRole = board.getUserRole(req.user._id);
    if (!['admin', 'owner'].includes(userRole)) {
      return res.status(403).json({
        message: 'Access denied - admin role required'
      });
    }

    // Delete all tasks in the list
    await Task.deleteMany({ list: list._id });

    // Remove list from board
    board.lists = board.lists.filter(listId => listId.toString() !== list._id.toString());
    board.addActivity(req.user._id, 'deleted list', `Deleted list "${list.title}"`);
    await board.save();

    // Delete the list
    await List.findByIdAndDelete(list._id);

    // Emit real-time event
    req.io.to(list.board.toString()).emit('list-deleted', {
      listId: list._id,
      boardId: list.board,
      userId: req.user._id
    });

    res.json({
      message: 'List deleted successfully'
    });

  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({
      message: 'Server error deleting list'
    });
  }
});

// @route   POST /api/lists/:id/tasks
// @desc    Create a new task in a list
// @access  Private
router.post('/:id/tasks', [
  auth,
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 200 })
    .withMessage('Task title cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Task description cannot exceed 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { title, description, priority, dueDate } = req.body;

    // Find list
    const list = await List.findById(id);
    if (!list) {
      return res.status(404).json({
        message: 'List not found'
      });
    }

    // Check board access
    const board = await Board.findById(list.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Get next position
    const position = await Task.getNextPosition(list._id);

    // Create new task
    const task = new Task({
      title,
      description: description || '',
      list: list._id,
      board: list.board,
      createdBy: req.user._id,
      position,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    await task.save();

    // Add task to list
    list.addTask(task._id);
    await list.save();

    // Add activity to board
    board.addActivity(req.user._id, 'created task', `Created task "${title}" in list "${list.title}"`);
    await board.save();

    // Populate task data
    await task.populate([
      { path: 'createdBy', select: 'username email firstName lastName avatar' },
      { path: 'assignedTo', select: 'username email firstName lastName avatar' }
    ]);

    // Emit real-time event
    req.io.to(list.board.toString()).emit('task-created', {
      task,
      listId: list._id,
      boardId: list.board,
      userId: req.user._id
    });

    res.status(201).json({
      message: 'Task created successfully',
      task
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      message: 'Server error creating task'
    });
  }
});

// @route   PUT /api/lists/:id/archive
// @desc    Archive/unarchive a list
// @access  Private
router.put('/:id/archive', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find list
    const list = await List.findById(id);
    if (!list) {
      return res.status(404).json({
        message: 'List not found'
      });
    }

    // Check board access
    const board = await Board.findById(list.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Toggle archive status
    list.isArchived = !list.isArchived;
    await list.save();

    // Add activity to board
    const action = list.isArchived ? 'archived' : 'unarchived';
    board.addActivity(req.user._id, `${action} list`, `${action.charAt(0).toUpperCase() + action.slice(1)} list "${list.title}"`);
    await board.save();

    // Emit real-time event
    req.io.to(list.board.toString()).emit('list-archived', {
      list,
      boardId: list.board,
      userId: req.user._id
    });

    res.json({
      message: `List ${action} successfully`,
      list
    });

  } catch (error) {
    console.error('Archive list error:', error);
    res.status(500).json({
      message: 'Server error archiving list'
    });
  }
});

// @route   PUT /api/lists/reorder
// @desc    Reorder lists
// @access  Private
router.put('/reorder', [
  auth,
  body('boardId')
    .notEmpty()
    .withMessage('Board ID is required')
    .isMongoId()
    .withMessage('Invalid board ID'),
  body('listIds')
    .isArray()
    .withMessage('List IDs must be an array')
    .custom((listIds) => {
      if (listIds.some(id => typeof id !== 'string')) {
        throw new Error('All list IDs must be strings');
      }
      return true;
    })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { boardId, listIds } = req.body;

    // Check board access
    const board = await Board.findById(boardId);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Update list positions
    const updatePromises = listIds.map((listId, index) => 
      List.findByIdAndUpdate(listId, { position: index })
    );

    await Promise.all(updatePromises);

    // Emit real-time event
    req.io.to(boardId).emit('lists-reordered', {
      boardId,
      listIds,
      userId: req.user._id
    });

    res.json({
      message: 'Lists reordered successfully'
    });

  } catch (error) {
    console.error('Reorder lists error:', error);
    res.status(500).json({
      message: 'Server error reordering lists'
    });
  }
});

module.exports = router;