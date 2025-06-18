const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Board title is required'],
    trim: true,
    maxlength: [100, 'Board title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Board description cannot exceed 500 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Board owner is required']
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List'
  }],
  backgroundColor: {
    type: String,
    default: '#0079bf'
  },
  backgroundImage: {
    type: String,
    default: ''
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  settings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowVoting: {
      type: Boolean,
      default: true
    },
    cardCover: {
      type: Boolean,
      default: true
    }
  },
  activity: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      required: true
    },
    details: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
boardSchema.index({ owner: 1 });
boardSchema.index({ 'members.user': 1 });
boardSchema.index({ createdAt: -1 });
boardSchema.index({ title: 'text', description: 'text' });

// Virtual for member count
boardSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for list count
boardSchema.virtual('listCount').get(function() {
  return this.lists.length;
});

// Instance method to check if user is member
boardSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString()) || 
         this.owner.toString() === userId.toString();
};

// Instance method to get user role
boardSchema.methods.getUserRole = function(userId) {
  if (this.owner.toString() === userId.toString()) {
    return 'owner';
  }
  
  const member = this.members.find(member => member.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Instance method to add member
boardSchema.methods.addMember = function(userId, role = 'member') {
  // Check if user is already a member
  const existingMember = this.members.find(member => member.user.toString() === userId.toString());
  
  if (!existingMember && this.owner.toString() !== userId.toString()) {
    this.members.push({
      user: userId,
      role: role,
      joinedAt: new Date()
    });
  }
  
  return this;
};

// Instance method to remove member
boardSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => member.user.toString() !== userId.toString());
  return this;
};

// Instance method to add activity
boardSchema.methods.addActivity = function(userId, action, details = '') {
  this.activity.unshift({
    user: userId,
    action: action,
    details: details,
    timestamp: new Date()
  });
  
  // Keep only last 50 activities
  if (this.activity.length > 50) {
    this.activity = this.activity.slice(0, 50);
  }
  
  return this;
};

// Static method to find boards by user
boardSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.user': userId }
    ],
    isArchived: false
  }).populate('owner', 'username email firstName lastName avatar')
    .populate('members.user', 'username email firstName lastName avatar')
    .sort({ updatedAt: -1 });
};

// Pre-save middleware to ensure owner is not in members array
boardSchema.pre('save', function(next) {
  if (this.owner) {
    this.members = this.members.filter(member => member.user.toString() !== this.owner.toString());
  }
  next();
});

module.exports = mongoose.model('Board', boardSchema);