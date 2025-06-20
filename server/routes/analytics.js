const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const boardAccess = require('../middleware/boardAccess');
const analyticsService = require('../services/analyticsService');

// Get board analytics
router.get('/board/:boardId', auth, boardAccess, async (req, res) => {
  try {
    const { boardId } = req.params;
    const analytics = await analyticsService.getBoardAnalytics(boardId, req.user.id);
    
    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

// Get user productivity analytics
router.get('/user/productivity', auth, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range based on timeframe
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const Task = require('../models/Task');
    const Board = require('../models/Board');

    // Get user's tasks
    const userTasks = await Task.find({
      $or: [
        { assignedTo: req.user.id },
        { createdBy: req.user.id }
      ],
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('list').populate({
      path: 'list',
      populate: {
        path: 'board',
        select: 'title'
      }
    });

    // Get user's boards
    const userBoards = await Board.find({
      $or: [
        { owner: req.user.id },
        { 'members.user': req.user.id }
      ]
    }).countDocuments();

    const completedTasks = userTasks.filter(task => task.isCompleted);
    const overdueTasks = userTasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < new Date() && !task.isCompleted
    );

    const productivity = {
      totalTasks: userTasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: userTasks.length - completedTasks.length,
      overdueTasks: overdueTasks.length,
      completionRate: userTasks.length > 0 ? (completedTasks.length / userTasks.length * 100).toFixed(1) : 0,
      totalBoards: userBoards,
      averageTasksPerDay: (userTasks.length / parseInt(timeframe)).toFixed(1),
      timeframe
    };

    res.json(productivity);
  } catch (error) {
    console.error('User productivity analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch user analytics' });
  }
});

// Get team analytics for a board
router.get('/team/:boardId', auth, boardAccess, async (req, res) => {
  try {
    const { boardId } = req.params;
    const Board = require('../models/Board');
    
    const board = await Board.findById(boardId).populate({
      path: 'lists',
      populate: {
        path: 'tasks',
        populate: {
          path: 'assignedTo createdBy',
          select: 'username firstName lastName'
        }
      }
    }).populate('members.user', 'username firstName lastName');

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const allTasks = board.lists.reduce((acc, list) => [...acc, ...list.tasks], []);
    const teamMembers = [...board.members, { user: board.owner, role: 'owner' }];

    const teamAnalytics = teamMembers.map(member => {
      const memberTasks = allTasks.filter(task => 
        task.assignedTo && task.assignedTo._id.toString() === member.user._id.toString()
      );
      const completedTasks = memberTasks.filter(task => task.isCompleted);
      
      return {
        user: member.user,
        role: member.role,
        totalTasks: memberTasks.length,
        completedTasks: completedTasks.length,
        completionRate: memberTasks.length > 0 ? (completedTasks.length / memberTasks.length * 100).toFixed(1) : 0,
        averageComplexity: memberTasks.length > 0 
          ? (memberTasks.reduce((sum, task) => sum + (task.complexity || 3), 0) / memberTasks.length).toFixed(1)
          : 0
      };
    });

    res.json({
      boardTitle: board.title,
      teamSize: teamMembers.length,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(task => task.isCompleted).length,
      members: teamAnalytics
    });
  } catch (error) {
    console.error('Team analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch team analytics' });
  }
});

// Get time tracking analytics
router.get('/time-tracking/:boardId', auth, boardAccess, async (req, res) => {
  try {
    const { boardId } = req.params;
    const Board = require('../models/Board');
    
    const board = await Board.findById(boardId).populate({
      path: 'lists',
      populate: {
        path: 'tasks',
        select: 'title timeSpent estimatedTime isCompleted createdAt updatedAt'
      }
    });

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const allTasks = board.lists.reduce((acc, list) => [...acc, ...list.tasks], []);
    
    const totalTimeSpent = allTasks.reduce((sum, task) => sum + (task.timeSpent || 0), 0);
    const totalEstimatedTime = allTasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);
    const completedTasks = allTasks.filter(task => task.isCompleted);
    
    const timeTracking = {
      totalTimeSpent,
      totalEstimatedTime,
      timeVariance: totalEstimatedTime > 0 
        ? ((totalTimeSpent - totalEstimatedTime) / totalEstimatedTime * 100).toFixed(1)
        : 0,
      averageTaskDuration: completedTasks.length > 0 
        ? (totalTimeSpent / completedTasks.length).toFixed(1) 
        : 0,
      tasksWithTimeTracking: allTasks.filter(task => task.timeSpent > 0).length,
      efficiency: totalEstimatedTime > 0 && totalTimeSpent > 0
        ? (totalEstimatedTime / totalTimeSpent * 100).toFixed(1)
        : 0
    };

    res.json(timeTracking);
  } catch (error) {
    console.error('Time tracking analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch time tracking analytics' });
  }
});

// Export analytics data
router.get('/export/:boardId', auth, boardAccess, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { format = 'json' } = req.query;
    
    const analytics = await analyticsService.getBoardAnalytics(boardId, req.user.id);
    
    if (format === 'csv') {
      // Convert to CSV format
      const csv = this.convertToCSV(analytics);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="board-analytics-${boardId}.csv"`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="board-analytics-${boardId}.json"`);
      res.json(analytics);
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ message: 'Failed to export analytics' });
  }
});

// Helper function to convert analytics to CSV
function convertToCSV(analytics) {
  const rows = [];
  
  // Overview section
  rows.push('Section,Metric,Value');
  rows.push(`Overview,Total Tasks,${analytics.overview.totalTasks}`);
  rows.push(`Overview,Completed Tasks,${analytics.overview.completedTasks}`);
  rows.push(`Overview,Pending Tasks,${analytics.overview.pendingTasks}`);
  rows.push(`Overview,Overdue Tasks,${analytics.overview.overdueTasks}`);
  rows.push(`Overview,Completion Rate,${analytics.overview.completionRate}%`);
  
  // Team performance
  if (analytics.teamPerformance && analytics.teamPerformance.length > 0) {
    rows.push('');
    rows.push('Team Member,Total Tasks,Completed Tasks,Completion Rate');
    analytics.teamPerformance.forEach(member => {
      rows.push(`${member.name},${member.totalTasks},${member.completedTasks},${member.completionRate}%`);
    });
  }
  
  return rows.join('\n');
}

module.exports = router;