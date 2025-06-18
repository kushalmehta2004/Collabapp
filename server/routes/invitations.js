const express = require('express');
const { body, validationResult } = require('express-validator');
const Invitation = require('../models/Invitation');
const Board = require('../models/Board');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/invitations
// @desc    Send board invitation
// @access  Private
router.post('/', [
  auth,
  body('boardId')
    .notEmpty()
    .withMessage('Board ID is required')
    .isMongoId()
    .withMessage('Invalid board ID'),
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'member', 'viewer'])
    .withMessage('Role must be admin, member, or viewer'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters')
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

    const { boardId, username, role = 'member', message } = req.body;

    // Find the board
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        message: 'Board not found'
      });
    }

    // Check if user has permission to invite (must be admin or owner)
    const userRole = board.getUserRole(req.user._id);
    if (!userRole || (userRole !== 'admin' && board.owner.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        message: 'You do not have permission to invite members to this board'
      });
    }

    // Find the user to invite
    const invitee = await User.findOne({ username }).select('_id username email firstName lastName');
    if (!invitee) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Check if user is trying to invite themselves
    if (invitee._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: 'You cannot invite yourself'
      });
    }

    // Check if user is already a member
    if (board.isMember(invitee._id)) {
      return res.status(400).json({
        message: 'User is already a member of this board'
      });
    }

    // Check if invitation already exists
    const existingInvitation = await Invitation.exists(boardId, invitee._id);
    if (existingInvitation) {
      return res.status(400).json({
        message: 'Invitation already sent to this user'
      });
    }

    // Create invitation
    const invitation = new Invitation({
      board: boardId,
      inviter: req.user._id,
      invitee: invitee._id,
      role,
      message
    });

    await invitation.save();

    // Populate invitation data
    await invitation.populate([
      { path: 'board', select: 'title description backgroundColor' },
      { path: 'inviter', select: 'username firstName lastName avatar' },
      { path: 'invitee', select: 'username firstName lastName avatar' }
    ]);

    // Emit real-time event to invitee
    req.io.to(invitee._id.toString()).emit('invitation-received', {
      invitation,
      message: `${req.user.username} invited you to join "${board.title}"`
    });

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation
    });

  } catch (error) {
    console.error('Send invitation error:', error);
    res.status(500).json({
      message: 'Server error sending invitation'
    });
  }
});

// @route   GET /api/invitations/received
// @desc    Get received invitations for current user
// @access  Private
router.get('/received', auth, async (req, res) => {
  try {
    const invitations = await Invitation.findPendingForUser(req.user._id);

    res.json({
      message: 'Invitations retrieved successfully',
      invitations
    });

  } catch (error) {
    console.error('Get received invitations error:', error);
    res.status(500).json({
      message: 'Server error retrieving invitations'
    });
  }
});

// @route   GET /api/invitations/sent
// @desc    Get sent invitations for current user
// @access  Private
router.get('/sent', auth, async (req, res) => {
  try {
    const invitations = await Invitation.findSentByUser(req.user._id);

    res.json({
      message: 'Sent invitations retrieved successfully',
      invitations
    });

  } catch (error) {
    console.error('Get sent invitations error:', error);
    res.status(500).json({
      message: 'Server error retrieving sent invitations'
    });
  }
});

// @route   PUT /api/invitations/:id/accept
// @desc    Accept board invitation
// @access  Private
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find invitation
    const invitation = await Invitation.findById(id)
      .populate('board')
      .populate('inviter', 'username firstName lastName');

    if (!invitation) {
      return res.status(404).json({
        message: 'Invitation not found'
      });
    }

    // Check if user is the invitee
    if (invitation.invitee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You are not authorized to accept this invitation'
      });
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({
        message: 'Invitation is no longer pending'
      });
    }

    // Check if invitation is expired
    if (invitation.isExpired) {
      return res.status(400).json({
        message: 'Invitation has expired'
      });
    }

    // Accept invitation
    invitation.accept();
    await invitation.save();

    // Add user to board
    const board = invitation.board;
    board.addMember(req.user._id, invitation.role);
    await board.save();

    // Add activity to board
    board.addActivity(req.user._id, 'joined board', `${req.user.username} joined the board`);
    await board.save();

    // Emit real-time events
    req.io.to(board._id.toString()).emit('member-joined', {
      user: {
        _id: req.user._id,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        avatar: req.user.avatar
      },
      role: invitation.role,
      boardId: board._id
    });

    req.io.to(invitation.inviter.toString()).emit('invitation-accepted', {
      invitation,
      message: `${req.user.username} accepted your invitation to join "${board.title}"`
    });

    res.json({
      message: 'Invitation accepted successfully',
      board: {
        _id: board._id,
        title: board.title,
        description: board.description,
        backgroundColor: board.backgroundColor
      }
    });

  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({
      message: 'Server error accepting invitation'
    });
  }
});

// @route   PUT /api/invitations/:id/decline
// @desc    Decline board invitation
// @access  Private
router.put('/:id/decline', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find invitation
    const invitation = await Invitation.findById(id)
      .populate('board', 'title')
      .populate('inviter', 'username');

    if (!invitation) {
      return res.status(404).json({
        message: 'Invitation not found'
      });
    }

    // Check if user is the invitee
    if (invitation.invitee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You are not authorized to decline this invitation'
      });
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({
        message: 'Invitation is no longer pending'
      });
    }

    // Decline invitation
    invitation.decline();
    await invitation.save();

    // Emit real-time event to inviter
    req.io.to(invitation.inviter._id.toString()).emit('invitation-declined', {
      invitation,
      message: `${req.user.username} declined your invitation to join "${invitation.board.title}"`
    });

    res.json({
      message: 'Invitation declined successfully'
    });

  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({
      message: 'Server error declining invitation'
    });
  }
});

// @route   DELETE /api/invitations/:id
// @desc    Cancel invitation (only by inviter)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find invitation
    const invitation = await Invitation.findById(id);

    if (!invitation) {
      return res.status(404).json({
        message: 'Invitation not found'
      });
    }

    // Check if user is the inviter
    if (invitation.inviter.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You are not authorized to cancel this invitation'
      });
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({
        message: 'Only pending invitations can be cancelled'
      });
    }

    // Cancel invitation
    invitation.cancel();
    await invitation.save();

    res.json({
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({
      message: 'Server error cancelling invitation'
    });
  }
});

module.exports = router;