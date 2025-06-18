const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Task description cannot exceed 2000 characters']
  },
  list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: [true, 'List reference is required']
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: [true, 'Board reference is required']
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator reference is required']
  },
  position: {
    type: Number,
    required: true,
    default: 0
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'done'],
    default: 'todo'
  },
  dueDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  labels: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Label name cannot exceed 50 characters']
    },
    color: {
      type: String,
      default: '#61bd4f'
    }
  }],
  checklist: [{
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Checklist item cannot exceed 200 characters']
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    isEdited: {
      type: Boolean,
      default: false
    }
  }],
  cover: {
    type: String,
    default: ''
  },
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHours: {
    type: Number,
    min: 0
  },
  // Time tracking entries
  timeEntries: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number, // in minutes
      default: 0
    },
    description: {
      type: String,
      maxlength: 200
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Task dependencies
  dependencies: [{
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    type: {
      type: String,
      enum: ['blocks', 'blocked-by', 'related'],
      default: 'blocks'
    }
  }],
  // Start date for scheduling
  startDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
taskSchema.index({ list: 1, position: 1 });
taskSchema.index({ board: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ title: 'text', description: 'text' });

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && !this.isCompleted;
});

// Virtual for checklist completion percentage
taskSchema.virtual('checklistProgress').get(function() {
  if (this.checklist.length === 0) return 0;
  const completed = this.checklist.filter(item => item.isCompleted).length;
  return Math.round((completed / this.checklist.length) * 100);
});

// Instance method to add comment
taskSchema.methods.addComment = function(userId, text) {
  this.comments.push({
    text: text,
    author: userId,
    createdAt: new Date()
  });
  return this;
};

// Instance method to add checklist item
taskSchema.methods.addChecklistItem = function(text) {
  this.checklist.push({
    text: text,
    isCompleted: false
  });
  return this;
};

// Instance method to toggle checklist item
taskSchema.methods.toggleChecklistItem = function(itemId, userId) {
  const item = this.checklist.id(itemId);
  if (item) {
    item.isCompleted = !item.isCompleted;
    if (item.isCompleted) {
      item.completedAt = new Date();
      item.completedBy = userId;
    } else {
      item.completedAt = undefined;
      item.completedBy = undefined;
    }
  }
  return this;
};

// Instance method to assign user
taskSchema.methods.assignUser = function(userId) {
  if (!this.assignedTo.includes(userId)) {
    this.assignedTo.push(userId);
  }
  return this;
};

// Instance method to unassign user
taskSchema.methods.unassignUser = function(userId) {
  this.assignedTo = this.assignedTo.filter(user => user.toString() !== userId.toString());
  return this;
};

// Instance method to add label
taskSchema.methods.addLabel = function(name, color = '#61bd4f') {
  const existingLabel = this.labels.find(label => label.name === name);
  if (!existingLabel) {
    this.labels.push({ name, color });
  }
  return this;
};

// Instance method to remove label
taskSchema.methods.removeLabel = function(labelName) {
  this.labels = this.labels.filter(label => label.name !== labelName);
  return this;
};

// Instance method to mark as completed
taskSchema.methods.markCompleted = function() {
  this.isCompleted = true;
  this.completedAt = new Date();
  this.status = 'done';
  return this;
};

// Instance method to mark as incomplete
taskSchema.methods.markIncomplete = function() {
  this.isCompleted = false;
  this.completedAt = undefined;
  if (this.status === 'done') {
    this.status = 'todo';
  }
  return this;
};

// Instance method to start time tracking
taskSchema.methods.startTimeTracking = function(userId, description = '') {
  // Check if user already has an active time entry
  const activeEntry = this.timeEntries.find(entry => 
    entry.user.toString() === userId.toString() && !entry.endTime
  );
  
  if (activeEntry) {
    throw new Error('User already has an active time entry for this task');
  }

  this.timeEntries.push({
    user: userId,
    startTime: new Date(),
    description: description
  });
  return this;
};

// Instance method to stop time tracking
taskSchema.methods.stopTimeTracking = function(userId) {
  const activeEntry = this.timeEntries.find(entry => 
    entry.user.toString() === userId.toString() && !entry.endTime
  );
  
  if (!activeEntry) {
    throw new Error('No active time entry found for this user');
  }

  activeEntry.endTime = new Date();
  activeEntry.duration = Math.round((activeEntry.endTime - activeEntry.startTime) / (1000 * 60)); // in minutes
  
  // Update actual hours
  this.actualHours = (this.actualHours || 0) + (activeEntry.duration / 60);
  
  return this;
};

// Instance method to get total time spent
taskSchema.methods.getTotalTimeSpent = function() {
  return this.timeEntries.reduce((total, entry) => {
    return total + (entry.duration || 0);
  }, 0);
};

// Instance method to get time spent by user
taskSchema.methods.getTimeSpentByUser = function(userId) {
  return this.timeEntries
    .filter(entry => entry.user.toString() === userId.toString())
    .reduce((total, entry) => total + (entry.duration || 0), 0);
};

// Static method to find tasks by list
taskSchema.statics.findByList = function(listId) {
  return this.find({ 
    list: listId, 
    isArchived: false 
  }).populate('assignedTo', 'username email firstName lastName avatar')
    .populate('createdBy', 'username email firstName lastName avatar')
    .populate('comments.author', 'username email firstName lastName avatar')
    .sort({ position: 1 });
};

// Static method to find tasks by board
taskSchema.statics.findByBoard = function(boardId) {
  return this.find({ 
    board: boardId, 
    isArchived: false 
  }).populate('assignedTo', 'username email firstName lastName avatar')
    .populate('createdBy', 'username email firstName lastName avatar')
    .populate('list', 'title')
    .sort({ createdAt: -1 });
};

// Static method to get next position in list
taskSchema.statics.getNextPosition = async function(listId) {
  const lastTask = await this.findOne({ list: listId })
    .sort({ position: -1 })
    .select('position');
  
  return lastTask ? lastTask.position + 1 : 0;
};

// Pre-save middleware to update completion status
taskSchema.pre('save', function(next) {
  if (this.isCompleted && !this.completedAt) {
    this.completedAt = new Date();
  } else if (!this.isCompleted && this.completedAt) {
    this.completedAt = undefined;
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);