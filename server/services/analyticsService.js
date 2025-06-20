const Task = require('../models/Task');
const Board = require('../models/Board');
const User = require('../models/User');

class AnalyticsService {
  async getBoardAnalytics(boardId, userId) {
    try {
      const board = await Board.findById(boardId).populate({
        path: 'lists',
        populate: {
          path: 'tasks',
          populate: {
            path: 'assignedTo createdBy',
            select: 'username firstName lastName'
          }
        }
      });

      if (!board) {
        throw new Error('Board not found');
      }

      const analytics = {
        overview: await this.getOverviewStats(board),
        productivity: await this.getProductivityStats(board),
        teamPerformance: await this.getTeamPerformanceStats(board),
        timeTracking: await this.getTimeTrackingStats(board),
        taskDistribution: await this.getTaskDistributionStats(board),
        completionTrends: await this.getCompletionTrends(board),
        burndownChart: await this.getBurndownData(board)
      };

      return analytics;
    } catch (error) {
      console.error('Analytics Service Error:', error);
      throw error;
    }
  }

  async getOverviewStats(board) {
    const allTasks = board.lists.reduce((acc, list) => [...acc, ...list.tasks], []);
    
    const completedTasks = allTasks.filter(task => task.isCompleted);
    const overdueTasks = allTasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < new Date() && !task.isCompleted
    );
    const highPriorityTasks = allTasks.filter(task => task.priority === 'high');

    return {
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: allTasks.length - completedTasks.length,
      overdueTasks: overdueTasks.length,
      highPriorityTasks: highPriorityTasks.length,
      completionRate: allTasks.length > 0 ? (completedTasks.length / allTasks.length * 100).toFixed(1) : 0
    };
  }

  async getProductivityStats(board) {
    const allTasks = board.lists.reduce((acc, list) => [...acc, ...list.tasks], []);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const tasksThisWeek = allTasks.filter(task => 
      task.createdAt >= weekAgo
    );
    const tasksThisMonth = allTasks.filter(task => 
      task.createdAt >= monthAgo
    );
    const completedThisWeek = allTasks.filter(task => 
      task.isCompleted && task.updatedAt >= weekAgo
    );

    return {
      tasksCreatedThisWeek: tasksThisWeek.length,
      tasksCreatedThisMonth: tasksThisMonth.length,
      tasksCompletedThisWeek: completedThisWeek.length,
      averageTasksPerDay: (tasksThisWeek.length / 7).toFixed(1),
      averageCompletionTime: await this.calculateAverageCompletionTime(allTasks)
    };
  }

  async getTeamPerformanceStats(board) {
    const allTasks = board.lists.reduce((acc, list) => [...acc, ...list.tasks], []);
    const teamStats = {};

    // Get unique team members
    const teamMembers = new Set();
    allTasks.forEach(task => {
      if (task.assignedTo) {
        teamMembers.add(task.assignedTo._id.toString());
      }
      if (task.createdBy) {
        teamMembers.add(task.createdBy._id.toString());
      }
    });

    // Calculate stats for each member
    for (const memberId of teamMembers) {
      const memberTasks = allTasks.filter(task => 
        task.assignedTo && task.assignedTo._id.toString() === memberId
      );
      const completedTasks = memberTasks.filter(task => task.isCompleted);
      
      const member = memberTasks[0]?.assignedTo || allTasks.find(t => 
        t.createdBy && t.createdBy._id.toString() === memberId
      )?.createdBy;

      if (member) {
        teamStats[memberId] = {
          name: member.firstName && member.lastName 
            ? `${member.firstName} ${member.lastName}` 
            : member.username,
          totalTasks: memberTasks.length,
          completedTasks: completedTasks.length,
          completionRate: memberTasks.length > 0 
            ? (completedTasks.length / memberTasks.length * 100).toFixed(1) 
            : 0,
          averageTaskComplexity: this.calculateAverageComplexity(memberTasks)
        };
      }
    }

    return Object.values(teamStats);
  }

  async getTimeTrackingStats(board) {
    const allTasks = board.lists.reduce((acc, list) => [...acc, ...list.tasks], []);
    
    const totalTimeSpent = allTasks.reduce((total, task) => {
      return total + (task.timeSpent || 0);
    }, 0);

    const totalEstimatedTime = allTasks.reduce((total, task) => {
      return total + (task.estimatedTime || 0);
    }, 0);

    return {
      totalTimeSpent: totalTimeSpent,
      totalEstimatedTime: totalEstimatedTime,
      timeVariance: totalEstimatedTime > 0 
        ? ((totalTimeSpent - totalEstimatedTime) / totalEstimatedTime * 100).toFixed(1)
        : 0,
      averageTaskDuration: allTasks.length > 0 
        ? (totalTimeSpent / allTasks.length).toFixed(1) 
        : 0
    };
  }

  async getTaskDistributionStats(board) {
    const allTasks = board.lists.reduce((acc, list) => [...acc, ...list.tasks], []);
    
    const priorityDistribution = {
      low: allTasks.filter(task => task.priority === 'low').length,
      medium: allTasks.filter(task => task.priority === 'medium').length,
      high: allTasks.filter(task => task.priority === 'high').length
    };

    const categoryDistribution = {};
    allTasks.forEach(task => {
      const category = task.category || 'Uncategorized';
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    });

    const listDistribution = {};
    board.lists.forEach(list => {
      listDistribution[list.title] = list.tasks.length;
    });

    return {
      priorityDistribution,
      categoryDistribution,
      listDistribution
    };
  }

  async getCompletionTrends(board) {
    const allTasks = board.lists.reduce((acc, list) => [...acc, ...list.tasks], []);
    const last30Days = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const completedOnDate = allTasks.filter(task => {
        if (!task.isCompleted || !task.updatedAt) return false;
        const taskDate = new Date(task.updatedAt).toISOString().split('T')[0];
        return taskDate === dateStr;
      }).length;

      const createdOnDate = allTasks.filter(task => {
        const taskDate = new Date(task.createdAt).toISOString().split('T')[0];
        return taskDate === dateStr;
      }).length;

      last30Days.push({
        date: dateStr,
        completed: completedOnDate,
        created: createdOnDate
      });
    }

    return last30Days;
  }

  async getBurndownData(board) {
    const allTasks = board.lists.reduce((acc, list) => [...acc, ...list.tasks], []);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.isCompleted).length;
    const remainingTasks = totalTasks - completedTasks;

    // Simple burndown calculation
    const burndownData = [];
    const daysInSprint = 14; // Assume 2-week sprints
    
    for (let day = 0; day <= daysInSprint; day++) {
      const idealRemaining = totalTasks - (totalTasks / daysInSprint * day);
      burndownData.push({
        day: day,
        ideal: Math.max(0, idealRemaining),
        actual: day === daysInSprint ? remainingTasks : null // Only show actual for current day
      });
    }

    return burndownData;
  }

  calculateAverageComplexity(tasks) {
    if (tasks.length === 0) return 0;
    const totalComplexity = tasks.reduce((sum, task) => sum + (task.complexity || 3), 0);
    return (totalComplexity / tasks.length).toFixed(1);
  }

  async calculateAverageCompletionTime(tasks) {
    const completedTasks = tasks.filter(task => task.isCompleted && task.createdAt);
    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
      const created = new Date(task.createdAt);
      const completed = new Date(task.updatedAt);
      return sum + (completed - created);
    }, 0);

    const averageMs = totalTime / completedTasks.length;
    const averageDays = averageMs / (1000 * 60 * 60 * 24);
    return averageDays.toFixed(1);
  }
}

module.exports = new AnalyticsService();