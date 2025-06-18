const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const List = require('../models/List');
const Board = require('../models/Board');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/tasks/:id
// @desc    Get a specific task
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate('assignedTo', 'username email firstName lastName avatar')
      .populate('createdBy', 'username email firstName lastName avatar')
      .populate('comments.author', 'username email firstName lastName avatar')
      .populate('list', 'title')
      .populate('board', 'title');

    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Check if user has access to the board
    const board = await Board.findById(task.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    res.json({
      message: 'Task retrieved successfully',
      task
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      message: 'Server error retrieving task'
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', [
  auth,
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Task title cannot be empty')
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
    .withMessage('Due date must be a valid date'),
  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'review', 'done'])
    .withMessage('Status must be todo, in-progress, review, or done')
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
    const { title, description, priority, dueDate, status, isCompleted } = req.body;

    // Find task
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Check board access
    const board = await Board.findById(task.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Update task fields
    const oldTitle = task.title;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) task.status = status;
    if (isCompleted !== undefined) {
      if (isCompleted) {
        task.markCompleted();
      } else {
        task.markIncomplete();
      }
    }

    await task.save();

    // Add activity to board
    if (title && title !== oldTitle) {
      board.addActivity(req.user._id, 'updated task', `Updated task "${oldTitle}" to "${title}"`);
      await board.save();
    }

    // Populate task data
    await task.populate([
      { path: 'assignedTo', select: 'username email firstName lastName avatar' },
      { path: 'createdBy', select: 'username email firstName lastName avatar' },
      { path: 'comments.author', select: 'username email firstName lastName avatar' }
    ]);

    // Emit real-time event
    req.io.to(task.board.toString()).emit('task-updated', {
      task,
      listId: task.list,
      boardId: task.board,
      userId: req.user._id
    });

    res.json({
      message: 'Task updated successfully',
      task
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      message: 'Server error updating task'
    });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find task
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Check board access
    const board = await Board.findById(task.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Remove task from list
    const list = await List.findById(task.list);
    if (list) {
      list.removeTask(task._id);
      await list.save();
    }

    // Add activity to board
    board.addActivity(req.user._id, 'deleted task', `Deleted task "${task.title}"`);
    await board.save();

    // Delete the task
    await Task.findByIdAndDelete(task._id);

    // Emit real-time event
    req.io.to(task.board.toString()).emit('task-deleted', {
      taskId: task._id,
      listId: task.list,
      boardId: task.board,
      userId: req.user._id
    });

    res.json({
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      message: 'Server error deleting task'
    });
  }
});

// @route   PUT /api/tasks/:id/move
// @desc    Move task between lists
// @access  Private
router.put('/:id/move', [
  auth,
  body('sourceListId')
    .notEmpty()
    .withMessage('Source list ID is required')
    .isMongoId()
    .withMessage('Invalid source list ID'),
  body('destinationListId')
    .notEmpty()
    .withMessage('Destination list ID is required')
    .isMongoId()
    .withMessage('Invalid destination list ID'),
  body('newPosition')
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

    const { id } = req.params;
    const { sourceListId, destinationListId, newPosition } = req.body;

    // Find task
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Check board access
    const board = await Board.findById(task.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Find source and destination lists
    const sourceList = await List.findById(sourceListId);
    const destinationList = await List.findById(destinationListId);

    if (!sourceList || !destinationList) {
      return res.status(404).json({
        message: 'List not found'
      });
    }

    // Remove task from source list
    sourceList.removeTask(task._id);
    await sourceList.save();

    // Add task to destination list at new position
    destinationList.tasks.splice(newPosition, 0, task._id);
    await destinationList.save();

    // Update task's list reference
    task.list = destinationListId;
    task.position = newPosition;
    await task.save();

    // Add activity to board
    if (sourceListId !== destinationListId) {
      board.addActivity(req.user._id, 'moved task', 
        `Moved task "${task.title}" from "${sourceList.title}" to "${destinationList.title}"`);
      await board.save();
    }

    // Emit real-time event
    req.io.to(task.board.toString()).emit('task-moved', {
      taskId: task._id,
      sourceListId,
      destinationListId,
      newPosition,
      boardId: task.board,
      userId: req.user._id
    });

    res.json({
      message: 'Task moved successfully',
      task
    });

  } catch (error) {
    console.error('Move task error:', error);
    res.status(500).json({
      message: 'Server error moving task'
    });
  }
});

// @route   PUT /api/tasks/reorder
// @desc    Reorder tasks within a list
// @access  Private
router.put('/reorder', [
  auth,
  body('listId')
    .notEmpty()
    .withMessage('List ID is required')
    .isMongoId()
    .withMessage('Invalid list ID'),
  body('taskIds')
    .isArray()
    .withMessage('Task IDs must be an array')
    .custom((taskIds) => {
      if (taskIds.some(id => typeof id !== 'string')) {
        throw new Error('All task IDs must be strings');
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

    const { listId, taskIds } = req.body;

    // Find list
    const list = await List.findById(listId);
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

    // Validate that all taskIds exist and belong to this list
    const tasks = await Task.find({ _id: { $in: taskIds }, list: listId });
    if (tasks.length !== taskIds.length) {
      return res.status(400).json({
        message: 'Some tasks do not exist or do not belong to this list'
      });
    }

    // Update task positions
    const updatePromises = taskIds.map((taskId, index) => 
      Task.findByIdAndUpdate(taskId, { position: index }, { new: true })
    );

    await Promise.all(updatePromises);

    // Update list's task order
    list.tasks = taskIds;
    await list.save();

    // Emit real-time event
    req.io.to(list.board.toString()).emit('tasks-reordered', {
      listId,
      taskIds,
      boardId: list.board,
      userId: req.user._id
    });

    res.json({
      message: 'Tasks reordered successfully'
    });

  } catch (error) {
    console.error('Reorder tasks error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Server error reordering tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/tasks/:id/comments
// @desc    Add comment to task
// @access  Private
router.post('/:id/comments', [
  auth,
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters')
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
    const { text } = req.body;

    // Find task
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Check board access
    const board = await Board.findById(task.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Add comment
    task.addComment(req.user._id, text);
    await task.save();

    // Populate the new comment
    await task.populate('comments.author', 'username email firstName lastName avatar');

    // Add activity to board
    board.addActivity(req.user._id, 'commented on task', `Commented on task "${task.title}"`);
    await board.save();

    // Emit real-time event
    req.io.to(task.board.toString()).emit('task-comment-added', {
      taskId: task._id,
      comment: task.comments[task.comments.length - 1],
      boardId: task.board,
      userId: req.user._id
    });

    res.json({
      message: 'Comment added successfully',
      comment: task.comments[task.comments.length - 1]
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      message: 'Server error adding comment'
    });
  }
});

// @route   POST /api/tasks/:id/assign
// @desc    Assign user to task
// @access  Private
router.post('/:id/assign', [
  auth,
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID')
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
    const { userId } = req.body;

    // Find task
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Check board access
    const board = await Board.findById(task.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Check if user to be assigned is a board member
    if (!board.isMember(userId)) {
      return res.status(400).json({
        message: 'User is not a member of this board'
      });
    }

    // Assign user
    task.assignUser(userId);
    await task.save();

    // Populate assigned users
    await task.populate('assignedTo', 'username email firstName lastName avatar');

    // Emit real-time event
    req.io.to(task.board.toString()).emit('task-assigned', {
      taskId: task._id,
      userId,
      assignedBy: req.user._id,
      boardId: task.board
    });

    res.json({
      message: 'User assigned successfully',
      task
    });

  } catch (error) {
    console.error('Assign user error:', error);
    res.status(500).json({
      message: 'Server error assigning user'
    });
  }
});

// @route   DELETE /api/tasks/:id/assign/:userId
// @desc    Unassign user from task
// @access  Private
router.delete('/:id/assign/:userId', auth, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Find task
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Check board access
    const board = await Board.findById(task.board);
    if (!board || !board.isMember(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Unassign user
    task.unassignUser(userId);
    await task.save();

    // Emit real-time event
    req.io.to(task.board.toString()).emit('task-unassigned', {
      taskId: task._id,
      userId,
      unassignedBy: req.user._id,
      boardId: task.board
    });

    res.json({
      message: 'User unassigned successfully'
    });

  } catch (error) {
    console.error('Unassign user error:', error);
    res.status(500).json({
      message: 'Server error unassigning user'
    });
  }
});

module.exports = router;