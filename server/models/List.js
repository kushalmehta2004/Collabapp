const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'List title is required'],
    trim: true,
    maxlength: [100, 'List title cannot exceed 100 characters']
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: [true, 'Board reference is required']
  },
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  position: {
    type: Number,
    required: true,
    default: 0
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#ddd'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
listSchema.index({ board: 1, position: 1 });
listSchema.index({ board: 1, isArchived: 1 });

// Virtual for task count
listSchema.virtual('taskCount').get(function() {
  return this.tasks.length;
});

// Instance method to add task
listSchema.methods.addTask = function(taskId) {
  if (!this.tasks.includes(taskId)) {
    this.tasks.push(taskId);
  }
  return this;
};

// Instance method to remove task
listSchema.methods.removeTask = function(taskId) {
  this.tasks = this.tasks.filter(task => task.toString() !== taskId.toString());
  return this;
};

// Instance method to move task
listSchema.methods.moveTask = function(taskId, newPosition) {
  // Remove task from current position
  this.tasks = this.tasks.filter(task => task.toString() !== taskId.toString());
  
  // Insert task at new position
  this.tasks.splice(newPosition, 0, taskId);
  
  return this;
};

// Static method to find lists by board
listSchema.statics.findByBoard = function(boardId) {
  return this.find({ 
    board: boardId, 
    isArchived: false 
  }).populate({
    path: 'tasks',
    match: { isArchived: false },
    options: { sort: { position: 1 } },
    populate: {
      path: 'assignedTo',
      select: 'username email firstName lastName avatar'
    }
  }).sort({ position: 1 });
};

// Static method to get next position
listSchema.statics.getNextPosition = async function(boardId) {
  const lastList = await this.findOne({ board: boardId })
    .sort({ position: -1 })
    .select('position');
  
  return lastList ? lastList.position + 1 : 0;
};

// Pre-remove middleware to handle task cleanup
listSchema.pre('remove', async function(next) {
  try {
    // Remove all tasks in this list
    const Task = mongoose.model('Task');
    await Task.deleteMany({ list: this._id });
    
    // Remove this list from board's lists array
    const Board = mongoose.model('Board');
    await Board.findByIdAndUpdate(
      this.board,
      { $pull: { lists: this._id } }
    );
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('List', listSchema);