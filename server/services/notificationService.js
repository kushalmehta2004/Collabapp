const webpush = require('web-push');
const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    // Configure Web Push
    webpush.setVapidDetails(
      'mailto:' + process.env.VAPID_EMAIL,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // Configure Email
    this.emailTransporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendPushNotification(subscription, payload) {
    try {
      const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
      return result;
    } catch (error) {
      console.error('Push notification error:', error);
      throw error;
    }
  }

  async sendBulkPushNotifications(subscriptions, payload) {
    const promises = subscriptions.map(subscription => 
      this.sendPushNotification(subscription, payload).catch(error => {
        console.error('Failed to send to subscription:', error);
        return null;
      })
    );

    const results = await Promise.allSettled(promises);
    return results;
  }

  async sendTaskAssignmentNotification(user, task, board) {
    const payload = {
      title: 'New Task Assigned',
      body: `You've been assigned: ${task.title}`,
      icon: '/icons/task-icon.png',
      badge: '/icons/badge-icon.png',
      data: {
        type: 'task_assigned',
        taskId: task._id,
        boardId: board._id,
        url: `/board/${board._id}`,
      },
      actions: [
        {
          action: 'view',
          title: 'View Task',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };

    // Send push notification if user has subscriptions
    if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
      await this.sendBulkPushNotifications(user.pushSubscriptions, payload);
    }

    // Send email notification
    await this.sendEmailNotification(
      user.email,
      'New Task Assignment',
      this.generateTaskAssignmentEmail(user, task, board)
    );
  }

  async sendTaskDueNotification(user, task, board) {
    const payload = {
      title: 'Task Due Soon',
      body: `Task "${task.title}" is due soon`,
      icon: '/icons/due-icon.png',
      badge: '/icons/badge-icon.png',
      data: {
        type: 'task_due',
        taskId: task._id,
        boardId: board._id,
        url: `/board/${board._id}`,
      },
    };

    if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
      await this.sendBulkPushNotifications(user.pushSubscriptions, payload);
    }
  }

  async sendBoardInvitationNotification(user, board, inviter) {
    const payload = {
      title: 'Board Invitation',
      body: `${inviter.firstName || inviter.username} invited you to "${board.title}"`,
      icon: '/icons/invitation-icon.png',
      badge: '/icons/badge-icon.png',
      data: {
        type: 'board_invitation',
        boardId: board._id,
        url: `/invitations`,
      },
    };

    if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
      await this.sendBulkPushNotifications(user.pushSubscriptions, payload);
    }

    // Send email invitation
    await this.sendEmailNotification(
      user.email,
      'Board Invitation',
      this.generateBoardInvitationEmail(user, board, inviter)
    );
  }

  async sendTaskCommentNotification(users, task, board, commenter, comment) {
    const payload = {
      title: 'New Comment',
      body: `${commenter.firstName || commenter.username} commented on "${task.title}"`,
      icon: '/icons/comment-icon.png',
      badge: '/icons/badge-icon.png',
      data: {
        type: 'task_comment',
        taskId: task._id,
        boardId: board._id,
        url: `/board/${board._id}`,
      },
    };

    for (const user of users) {
      if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
        await this.sendBulkPushNotifications(user.pushSubscriptions, payload);
      }
    }
  }

  async sendEmailNotification(to, subject, html) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        html: html,
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error('Email notification error:', error);
      throw error;
    }
  }

  generateTaskAssignmentEmail(user, task, board) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Task Assignment</h2>
        <p>Hi ${user.firstName || user.username},</p>
        <p>You've been assigned a new task in the board "<strong>${board.title}</strong>":</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${task.title}</h3>
          <p style="margin: 0; color: #666;">${task.description || 'No description provided'}</p>
          ${task.dueDate ? `<p style="margin: 10px 0 0 0; color: #e74c3c;"><strong>Due:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
        </div>
        
        <a href="${process.env.CLIENT_URL}/board/${board._id}" 
           style="background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Task
        </a>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Best regards,<br>
          The Collab App Team
        </p>
      </div>
    `;
  }

  generateBoardInvitationEmail(user, board, inviter) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Board Invitation</h2>
        <p>Hi ${user.firstName || user.username},</p>
        <p><strong>${inviter.firstName || inviter.username}</strong> has invited you to collaborate on the board "<strong>${board.title}</strong>".</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${board.title}</h3>
          <p style="margin: 0; color: #666;">${board.description || 'No description provided'}</p>
        </div>
        
        <a href="${process.env.CLIENT_URL}/invitations" 
           style="background: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Invitation
        </a>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Best regards,<br>
          The Collab App Team
        </p>
      </div>
    `;
  }

  async scheduleTaskDueReminders() {
    // This would be called by a cron job
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const nextDay = new Date(tomorrow);
      nextDay.setDate(nextDay.getDate() + 1);

      // Find tasks due tomorrow
      const Task = require('../models/Task');
      const tasksDueTomorrow = await Task.find({
        dueDate: {
          $gte: tomorrow,
          $lt: nextDay,
        },
        isCompleted: false,
      }).populate('assignedTo').populate({
        path: 'list',
        populate: {
          path: 'board',
          select: 'title',
        },
      });

      // Send notifications for each task
      for (const task of tasksDueTomorrow) {
        if (task.assignedTo && task.list && task.list.board) {
          await this.sendTaskDueNotification(
            task.assignedTo,
            task,
            task.list.board
          );
        }
      }

      console.log(`Sent ${tasksDueTomorrow.length} due date reminders`);
    } catch (error) {
      console.error('Error sending due date reminders:', error);
    }
  }
}

module.exports = new NotificationService();