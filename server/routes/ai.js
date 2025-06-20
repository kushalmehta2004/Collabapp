const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiService = require('../services/aiService');
const Board = require('../models/Board');
const Task = require('../models/Task');

// Generate task suggestions for a board
router.post('/suggest-tasks/:boardId', auth, async (req, res) => {
  try {
    const { boardId } = req.params;
    
    const board = await Board.findById(boardId).populate({
      path: 'lists',
      populate: {
        path: 'tasks',
        select: 'title description'
      }
    });

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Check if user has access to the board
    const hasAccess = board.owner.toString() === req.user.id ||
                     board.members.some(member => member.user.toString() === req.user.id) ||
                     !board.isPrivate;

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const existingTasks = board.lists.reduce((acc, list) => [...acc, ...list.tasks], []);
    const suggestions = await aiService.generateTaskSuggestions(board.title, existingTasks);

    res.json({ suggestions });
  } catch (error) {
    console.error('AI task suggestions error:', error);
    res.status(500).json({ message: 'Failed to generate task suggestions' });
  }
});

// Categorize a task
router.post('/categorize-task', auth, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const category = await aiService.categorizeTask(title, description || '');
    
    res.json({ category });
  } catch (error) {
    console.error('AI categorization error:', error);
    res.status(500).json({ message: 'Failed to categorize task' });
  }
});

// Estimate task complexity
router.post('/estimate-complexity', auth, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const complexity = await aiService.estimateTaskComplexity(title, description || '');
    
    res.json({ complexity });
  } catch (error) {
    console.error('AI complexity estimation error:', error);
    res.status(500).json({ message: 'Failed to estimate task complexity' });
  }
});

// Generate task breakdown
router.post('/breakdown-task', auth, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const breakdown = await aiService.generateTaskBreakdown(title, description || '');
    
    res.json({ breakdown });
  } catch (error) {
    console.error('AI task breakdown error:', error);
    res.status(500).json({ message: 'Failed to generate task breakdown' });
  }
});

// Batch process multiple tasks with AI
router.post('/batch-process', auth, async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ message: 'Tasks array is required' });
    }

    const results = await Promise.all(
      tasks.map(async (task) => {
        try {
          const [category, complexity, breakdown] = await Promise.all([
            aiService.categorizeTask(task.title, task.description || ''),
            aiService.estimateTaskComplexity(task.title, task.description || ''),
            aiService.generateTaskBreakdown(task.title, task.description || '')
          ]);

          return {
            id: task.id,
            category,
            complexity,
            breakdown,
            success: true
          };
        } catch (error) {
          return {
            id: task.id,
            error: error.message,
            success: false
          };
        }
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('AI batch processing error:', error);
    res.status(500).json({ message: 'Failed to process tasks' });
  }
});

module.exports = router;