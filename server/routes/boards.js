const express = require('express');
const { body, validationResult } = require('express-validator');
const Board = require('../models/Board');
const List = require('../models/List');
const Task = require('../models/Task');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { checkBoardAccess, checkBoardOwnership, checkBoardVisibility, checkBoardDeletionAccess } = require('../middleware/boardAccess');

const router = express.Router();

// @route   GET /api/boards
// @desc    Get all boards for the current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const boards = await Board.findByUser(req.user._id);
    
    res.json({
      message: 'Boards retrieved successfully',
      boards
    });
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({
      message: 'Server error retrieving boards'
    });
  }
});

// @route   POST /api/boards
// @desc    Create a new board
// @access  Private
router.post('/', [
  auth,
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Board title is required')
    .isLength({ max: 100 })
    .withMessage('Board title cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Board description cannot exceed 500 characters'),
  body('backgroundColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Background color must be a valid hex color'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean')
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

    const { title, description, backgroundColor, isPrivate } = req.body;

    // Create new board
    const board = new Board({
      title,
      description: description || '',
      owner: req.user._id,
      backgroundColor: backgroundColor || '#0079bf',
      isPrivate: isPrivate || false
    });

    // Add activity
    board.addActivity(req.user._id, 'created board', `Created board "${title}"`);

    await board.save();

    // Populate owner information
    await board.populate('owner', 'username email firstName lastName avatar');

    // Emit real-time event
    req.io.emit('board-created', {
      board,
      userId: req.user._id
    });

    res.status(201).json({
      message: 'Board created successfully',
      board
    });

  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({
      message: 'Server error creating board'
    });
  }
});

// @route   GET /api/boards/:id
// @desc    Get a specific board with lists and tasks
// @access  Private
router.get('/:id', auth, checkBoardVisibility, async (req, res) => {
  try {
    const board = req.board;

    // Get lists with tasks
    const lists = await List.findByBoard(board._id);

    // Populate board with additional data
    await board.populate([
      { path: 'owner', select: 'username email firstName lastName avatar' },
      { path: 'members.user', select: 'username email firstName lastName avatar' }
    ]);

    res.json({
      message: 'Board retrieved successfully',
      board: {
        ...board.toObject(),
        lists,
        userRole: req.userRole
      }
    });

  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({
      message: 'Server error retrieving board'
    });
  }
});

// @route   PUT /api/boards/:id
// @desc    Update a board
// @access  Private
router.put('/:id', [
  auth,
  checkBoardAccess('admin'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Board title cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Board title cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Board description cannot exceed 500 characters'),
  body('backgroundColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Background color must be a valid hex color'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean')
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

    const board = req.board;
    const { title, description, backgroundColor, isPrivate } = req.body;

    // Update board fields
    if (title !== undefined) {
      board.addActivity(req.user._id, 'updated board title', `Changed title from "${board.title}" to "${title}"`);
      board.title = title;
    }
    if (description !== undefined) board.description = description;
    if (backgroundColor !== undefined) board.backgroundColor = backgroundColor;
    if (isPrivate !== undefined) board.isPrivate = isPrivate;

    await board.save();

    // Populate board data
    await board.populate([
      { path: 'owner', select: 'username email firstName lastName avatar' },
      { path: 'members.user', select: 'username email firstName lastName avatar' }
    ]);

    // Emit real-time event
    req.io.to(board._id.toString()).emit('board-updated', {
      board,
      userId: req.user._id
    });

    res.json({
      message: 'Board updated successfully',
      board
    });

  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({
      message: 'Server error updating board'
    });
  }
});

// @route   DELETE /api/boards/:id
// @desc    Delete a board
// @access  Private
router.delete('/:id', auth, checkBoardDeletionAccess, async (req, res) => {
  try {
    const board = req.board;

    // Delete all tasks in the board
    await Task.deleteMany({ board: board._id });

    // Delete all lists in the board
    await List.deleteMany({ board: board._id });

    // Delete the board
    await Board.findByIdAndDelete(board._id);

    // Emit real-time event
    req.io.emit('board-deleted', {
      boardId: board._id,
      userId: req.user._id
    });

    res.json({
      message: 'Board deleted successfully'
    });

  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({
      message: 'Server error deleting board'
    });
  }
});

// @route   POST /api/boards/:id/members
// @desc    Add member to board
// @access  Private
router.post('/:id/members', [
  auth,
  checkBoardAccess('admin'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('role')
    .optional()
    .isIn(['member', 'admin', 'viewer'])
    .withMessage('Role must be member, admin, or viewer')
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

    const board = req.board;
    const { email, role = 'member' } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: 'User not found with this email'
      });
    }

    // Check if user is already a member
    if (board.isMember(user._id)) {
      return res.status(400).json({
        message: 'User is already a member of this board'
      });
    }

    // Add member
    board.addMember(user._id, role);
    board.addActivity(req.user._id, 'added member', `Added ${user.username} as ${role}`);

    await board.save();

    // Populate the new member data
    await board.populate('members.user', 'username email firstName lastName avatar');

    // Emit real-time event
    req.io.to(board._id.toString()).emit('member-added', {
      board,
      newMember: user,
      role,
      addedBy: req.user._id
    });

    res.json({
      message: 'Member added successfully',
      board
    });

  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      message: 'Server error adding member'
    });
  }
});

// @route   PUT /api/boards/:id/members/:userId
// @desc    Update member role
// @access  Private
router.put('/:id/members/:userId', [
  auth,
  checkBoardAccess('admin'),
  body('role')
    .isIn(['member', 'admin', 'viewer'])
    .withMessage('Role must be member, admin, or viewer')
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

    const board = req.board;
    const { userId } = req.params;
    const { role } = req.body;

    // Check if user is a member
    if (!board.isMember(userId)) {
      return res.status(400).json({
        message: 'User is not a member of this board'
      });
    }

    // Cannot update board owner role
    if (board.owner.toString() === userId) {
      return res.status(400).json({
        message: 'Cannot update board owner role'
      });
    }

    // Find and update the member
    const memberIndex = board.members.findIndex(member => member.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(400).json({
        message: 'Member not found'
      });
    }

    const oldRole = board.members[memberIndex].role;
    board.members[memberIndex].role = role;

    // Get user info for activity log
    const user = await User.findById(userId).select('username');
    board.addActivity(req.user._id, 'updated member role', `Changed ${user?.username || 'user'} role from ${oldRole} to ${role}`);

    await board.save();

    // Populate board data
    await board.populate([
      { path: 'owner', select: 'username email firstName lastName avatar' },
      { path: 'members.user', select: 'username email firstName lastName avatar' }
    ]);

    // Emit real-time event
    req.io.to(board._id.toString()).emit('member-role-updated', {
      boardId: board._id,
      userId: userId,
      newRole: role,
      updatedBy: req.user._id
    });

    res.json({
      message: 'Member role updated successfully',
      board
    });

  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      message: 'Server error updating member role'
    });
  }
});

// @route   DELETE /api/boards/:id/members/:userId
// @desc    Remove member from board
// @access  Private
router.delete('/:id/members/:userId', auth, checkBoardAccess('admin'), async (req, res) => {
  try {
    const board = req.board;
    const { userId } = req.params;

    // Check if user is a member
    if (!board.isMember(userId)) {
      return res.status(400).json({
        message: 'User is not a member of this board'
      });
    }

    // Cannot remove board owner
    if (board.owner.toString() === userId) {
      return res.status(400).json({
        message: 'Cannot remove board owner'
      });
    }

    // Get user info for activity log
    const user = await User.findById(userId).select('username');

    // Remove member
    board.removeMember(userId);
    board.addActivity(req.user._id, 'removed member', `Removed ${user?.username || 'user'} from board`);

    await board.save();

    // Emit real-time event
    req.io.to(board._id.toString()).emit('member-removed', {
      boardId: board._id,
      removedUserId: userId,
      removedBy: req.user._id
    });

    res.json({
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      message: 'Server error removing member'
    });
  }
});

// @route   GET /api/boards/:id/activity
// @desc    Get board activity
// @access  Private
router.get('/:id/activity', auth, checkBoardAccess('viewer'), async (req, res) => {
  try {
    const board = req.board;

    await board.populate('activity.user', 'username email firstName lastName avatar');

    res.json({
      message: 'Activity retrieved successfully',
      activity: board.activity
    });

  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      message: 'Server error retrieving activity'
    });
  }
});

module.exports = router;