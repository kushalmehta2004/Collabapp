const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: [true, 'Board reference is required']
  },
  inviter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Inviter reference is required']
  },
  invitee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Invitee reference is required']
  },
  role: {
    type: String,
    enum: ['admin', 'member', 'viewer'],
    default: 'member'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled'],
    default: 'pending'
  },
  message: {
    type: String,
    trim: true,
    maxlength: [500, 'Invitation message cannot exceed 500 characters']
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  respondedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
invitationSchema.index({ board: 1 });
invitationSchema.index({ inviter: 1 });
invitationSchema.index({ invitee: 1 });
invitationSchema.index({ status: 1 });
invitationSchema.index({ expiresAt: 1 });

// Compound index to prevent duplicate invitations
invitationSchema.index({ board: 1, invitee: 1, status: 1 }, { unique: true });

// Virtual for checking if invitation is expired
invitationSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Instance method to accept invitation
invitationSchema.methods.accept = function() {
  this.status = 'accepted';
  this.respondedAt = new Date();
  return this;
};

// Instance method to decline invitation
invitationSchema.methods.decline = function() {
  this.status = 'declined';
  this.respondedAt = new Date();
  return this;
};

// Instance method to cancel invitation
invitationSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this;
};

// Static method to find pending invitations for a user
invitationSchema.statics.findPendingForUser = function(userId) {
  return this.find({
    invitee: userId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate([
    { path: 'board', select: 'title description backgroundColor' },
    { path: 'inviter', select: 'username firstName lastName avatar' }
  ]).sort({ createdAt: -1 });
};

// Static method to find invitations sent by a user
invitationSchema.statics.findSentByUser = function(userId) {
  return this.find({
    inviter: userId
  }).populate([
    { path: 'board', select: 'title description' },
    { path: 'invitee', select: 'username firstName lastName avatar' }
  ]).sort({ createdAt: -1 });
};

// Static method to check if invitation already exists
invitationSchema.statics.exists = function(boardId, inviteeId) {
  return this.findOne({
    board: boardId,
    invitee: inviteeId,
    status: 'pending'
  });
};

// Pre-save middleware to handle expiration
invitationSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Invitation', invitationSchema);