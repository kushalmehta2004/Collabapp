const Fuse = require('fuse.js');
const Board = require('../models/Board');
const Task = require('../models/Task');
const List = require('../models/List');
const User = require('../models/User');

class SearchService {
  constructor() {
    this.fuseOptions = {
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'description', weight: 0.3 },
        { name: 'tags', weight: 0.5 },
      ],
    };
  }

  async globalSearch(query, userId, filters = {}) {
    try {
      const results = {
        boards: [],
        tasks: [],
        users: [],
        suggestions: [],
      };

      // Search boards
      if (!filters.type || filters.type === 'boards') {
        results.boards = await this.searchBoards(query, userId, filters);
      }

      // Search tasks
      if (!filters.type || filters.type === 'tasks') {
        results.tasks = await this.searchTasks(query, userId, filters);
      }

      // Search users (if allowed)
      if (!filters.type || filters.type === 'users') {
        results.users = await this.searchUsers(query, userId, filters);
      }

      // Generate search suggestions
      results.suggestions = await this.generateSearchSuggestions(query, userId);

      return results;
    } catch (error) {
      console.error('Global search error:', error);
      throw error;
    }
  }

  async searchBoards(query, userId, filters = {}) {
    try {
      // Get boards user has access to
      const boards = await Board.find({
        $or: [
          { owner: userId },
          { 'members.user': userId },
          { isPrivate: false },
        ],
      }).populate('owner', 'username firstName lastName')
        .populate('members.user', 'username firstName lastName')
        .lean();

      // Apply additional filters
      let filteredBoards = boards;

      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        filteredBoards = filteredBoards.filter(board => {
          const createdAt = new Date(board.createdAt);
          return createdAt >= new Date(start) && createdAt <= new Date(end);
        });
      }

      if (filters.owner) {
        filteredBoards = filteredBoards.filter(board => 
          board.owner._id.toString() === filters.owner
        );
      }

      // Use Fuse.js for fuzzy search
      const fuse = new Fuse(filteredBoards, {
        ...this.fuseOptions,
        keys: [
          { name: 'title', weight: 0.8 },
          { name: 'description', weight: 0.2 },
        ],
      });

      const searchResults = fuse.search(query);

      return searchResults.map(result => ({
        ...result.item,
        score: result.score,
        type: 'board',
        highlight: this.generateHighlight(result.item.title, query),
      }));
    } catch (error) {
      console.error('Board search error:', error);
      return [];
    }
  }

  async searchTasks(query, userId, filters = {}) {
    try {
      // Get tasks from boards user has access to
      const boards = await Board.find({
        $or: [
          { owner: userId },
          { 'members.user': userId },
          { isPrivate: false },
        ],
      }).select('_id');

      const boardIds = boards.map(board => board._id);

      const tasks = await Task.find({
        board: { $in: boardIds },
      }).populate('assignedTo', 'username firstName lastName')
        .populate('createdBy', 'username firstName lastName')
        .populate('list', 'title')
        .populate('board', 'title')
        .lean();

      // Apply filters
      let filteredTasks = tasks;

      if (filters.status) {
        if (filters.status === 'completed') {
          filteredTasks = filteredTasks.filter(task => task.isCompleted);
        } else if (filters.status === 'pending') {
          filteredTasks = filteredTasks.filter(task => !task.isCompleted);
        }
      }

      if (filters.priority) {
        filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
      }

      if (filters.assignedTo) {
        filteredTasks = filteredTasks.filter(task => 
          task.assignedTo && task.assignedTo._id.toString() === filters.assignedTo
        );
      }

      if (filters.dueDate) {
        const { operator, date } = filters.dueDate;
        filteredTasks = filteredTasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDue = new Date(task.dueDate);
          const filterDate = new Date(date);
          
          switch (operator) {
            case 'before':
              return taskDue < filterDate;
            case 'after':
              return taskDue > filterDate;
            case 'on':
              return taskDue.toDateString() === filterDate.toDateString();
            default:
              return true;
          }
        });
      }

      // Use Fuse.js for fuzzy search
      const fuse = new Fuse(filteredTasks, {
        ...this.fuseOptions,
        keys: [
          { name: 'title', weight: 0.6 },
          { name: 'description', weight: 0.3 },
          { name: 'tags', weight: 0.1 },
        ],
      });

      const searchResults = fuse.search(query);

      return searchResults.map(result => ({
        ...result.item,
        score: result.score,
        type: 'task',
        highlight: this.generateHighlight(result.item.title, query),
      }));
    } catch (error) {
      console.error('Task search error:', error);
      return [];
    }
  }

  async searchUsers(query, userId, filters = {}) {
    try {
      // Only search users if the query is long enough
      if (query.length < 2) return [];

      const users = await User.find({
        _id: { $ne: userId }, // Exclude current user
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      }).select('username firstName lastName email avatar')
        .limit(10)
        .lean();

      return users.map(user => ({
        ...user,
        type: 'user',
        displayName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.username,
        highlight: this.generateHighlight(
          user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.username, 
          query
        ),
      }));
    } catch (error) {
      console.error('User search error:', error);
      return [];
    }
  }

  async generateSearchSuggestions(query, userId) {
    try {
      const suggestions = [];

      // Get recent searches (you'd store these in a separate collection)
      // For now, generate based on common patterns

      // Task-related suggestions
      if (query.toLowerCase().includes('task')) {
        suggestions.push('tasks assigned to me', 'overdue tasks', 'high priority tasks');
      }

      // Board-related suggestions
      if (query.toLowerCase().includes('board')) {
        suggestions.push('my boards', 'shared boards', 'recent boards');
      }

      // Status-related suggestions
      if (query.toLowerCase().includes('complete')) {
        suggestions.push('completed tasks', 'completion rate', 'recently completed');
      }

      // Add some general suggestions
      suggestions.push(
        'tasks due today',
        'tasks due this week',
        'my recent activity',
        'team productivity'
      );

      return suggestions.slice(0, 5); // Limit to 5 suggestions
    } catch (error) {
      console.error('Search suggestions error:', error);
      return [];
    }
  }

  generateHighlight(text, query) {
    if (!text || !query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  async getSearchAnalytics(userId) {
    try {
      // This would typically be stored in a search analytics collection
      // For now, return some mock data
      return {
        totalSearches: 0,
        popularQueries: [],
        searchTrends: [],
        avgResultsPerSearch: 0,
      };
    } catch (error) {
      console.error('Search analytics error:', error);
      return null;
    }
  }

  async saveSearchQuery(userId, query, resultsCount) {
    try {
      // In a real implementation, you'd save this to a SearchHistory collection
      console.log(`User ${userId} searched for "${query}" and got ${resultsCount} results`);
    } catch (error) {
      console.error('Save search query error:', error);
    }
  }

  // Advanced search with complex queries
  async advancedSearch(searchParams, userId) {
    try {
      const {
        query,
        type,
        filters,
        sortBy = 'relevance',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
      } = searchParams;

      let results = [];

      switch (type) {
        case 'tasks':
          results = await this.searchTasks(query, userId, filters);
          break;
        case 'boards':
          results = await this.searchBoards(query, userId, filters);
          break;
        case 'users':
          results = await this.searchUsers(query, userId, filters);
          break;
        default:
          const globalResults = await this.globalSearch(query, userId, filters);
          results = [
            ...globalResults.boards,
            ...globalResults.tasks,
            ...globalResults.users,
          ];
      }

      // Sort results
      results = this.sortResults(results, sortBy, sortOrder);

      // Paginate results
      const startIndex = (page - 1) * limit;
      const paginatedResults = results.slice(startIndex, startIndex + limit);

      // Save search query for analytics
      await this.saveSearchQuery(userId, query, results.length);

      return {
        results: paginatedResults,
        totalResults: results.length,
        page,
        totalPages: Math.ceil(results.length / limit),
        hasNextPage: page * limit < results.length,
        hasPrevPage: page > 1,
      };
    } catch (error) {
      console.error('Advanced search error:', error);
      throw error;
    }
  }

  sortResults(results, sortBy, sortOrder) {
    const multiplier = sortOrder === 'desc' ? -1 : 1;

    return results.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return (a.score - b.score) * multiplier;
        case 'date':
          return (new Date(a.createdAt) - new Date(b.createdAt)) * multiplier;
        case 'title':
          return a.title.localeCompare(b.title) * multiplier;
        default:
          return 0;
      }
    });
  }
}

module.exports = new SearchService();