import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Flag, 
  User, 
  MessageCircle, 
  CheckSquare, 
  Paperclip,
  Tag,
  Play,
  Pause,
  Save,
  Trash2,
  Plus
} from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import taskService from '../../services/taskService';
import toast from 'react-hot-toast';

const TaskDetailModal = ({ task, isOpen, onClose, onUpdate }) => {
  const [taskData, setTaskData] = useState(task);
  const [isEditing, setIsEditing] = useState({});
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isTimeTracking, setIsTimeTracking] = useState(false);
  const [timeTrackingStart, setTimeTrackingStart] = useState(null);

  useEffect(() => {
    if (task) {
      setTaskData(task);
      // Check if user has active time tracking
      const activeEntry = task.timeEntries?.find(entry => 
        entry.user === 'current-user-id' && !entry.endTime
      );
      if (activeEntry) {
        setIsTimeTracking(true);
        setTimeTrackingStart(new Date(activeEntry.startTime));
      }
    }
  }, [task]);

  if (!isOpen || !taskData) return null;

  const handleUpdateTask = async (updates) => {
    try {
      const response = await taskService.updateTask(taskData._id, updates);
      setTaskData(response.task);
      onUpdate(response.task);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Update task error:', error);
      toast.error('Failed to update task');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await taskService.addComment(taskData._id, newComment.trim());
      setNewComment('');
      // Refresh task data
      const response = await taskService.getTask(taskData._id);
      setTaskData(response.task);
      toast.success('Comment added');
    } catch (error) {
      console.error('Add comment error:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleToggleChecklistItem = async (itemId) => {
    try {
      const updatedChecklist = taskData.checklist.map(item => 
        item._id === itemId 
          ? { ...item, isCompleted: !item.isCompleted }
          : item
      );
      
      await handleUpdateTask({ checklist: updatedChecklist });
    } catch (error) {
      console.error('Toggle checklist error:', error);
      toast.error('Failed to update checklist');
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) return;
    
    try {
      const updatedChecklist = [
        ...taskData.checklist,
        {
          text: newChecklistItem.trim(),
          isCompleted: false,
          createdAt: new Date()
        }
      ];
      
      await handleUpdateTask({ checklist: updatedChecklist });
      setNewChecklistItem('');
    } catch (error) {
      console.error('Add checklist item error:', error);
      toast.error('Failed to add checklist item');
    }
  };

  const handleTimeTracking = async () => {
    try {
      if (isTimeTracking) {
        // Stop time tracking
        await taskService.updateTask(taskData._id, { stopTimeTracking: true });
        setIsTimeTracking(false);
        setTimeTrackingStart(null);
        toast.success('Time tracking stopped');
      } else {
        // Start time tracking
        await taskService.updateTask(taskData._id, { startTimeTracking: true });
        setIsTimeTracking(true);
        setTimeTrackingStart(new Date());
        toast.success('Time tracking started');
      }
    } catch (error) {
      console.error('Time tracking error:', error);
      toast.error('Failed to update time tracking');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'in-progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'review': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'done': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const completedChecklistItems = taskData.checklist?.filter(item => item.isCompleted).length || 0;
  const totalChecklistItems = taskData.checklist?.length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CheckSquare className="text-gray-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            {isEditing.title ? (
              <input
                type="text"
                value={taskData.title}
                onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                onBlur={() => {
                  handleUpdateTask({ title: taskData.title });
                  setIsEditing({ ...isEditing, title: false });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateTask({ title: taskData.title });
                    setIsEditing({ ...isEditing, title: false });
                  }
                }}
                className="text-2xl font-bold text-gray-900 w-full border-b-2 border-blue-500 focus:outline-none bg-transparent"
                autoFocus
              />
            ) : (
              <h1
                className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-gray-700"
                onClick={() => setIsEditing({ ...isEditing, title: true })}
              >
                {taskData.title}
              </h1>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                {isEditing.description ? (
                  <textarea
                    value={taskData.description || ''}
                    onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                    onBlur={() => {
                      handleUpdateTask({ description: taskData.description });
                      setIsEditing({ ...isEditing, description: false });
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows="4"
                    placeholder="Add a description..."
                    autoFocus
                  />
                ) : (
                  <div
                    className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 min-h-[100px]"
                    onClick={() => setIsEditing({ ...isEditing, description: true })}
                  >
                    {taskData.description || (
                      <span className="text-gray-500 italic">Click to add description...</span>
                    )}
                  </div>
                )}
              </div>

              {/* Checklist */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Checklist ({completedChecklistItems}/{totalChecklistItems})
                  </h3>
                  {totalChecklistItems > 0 && (
                    <div className="text-sm text-gray-600">
                      {Math.round((completedChecklistItems / totalChecklistItems) * 100)}% complete
                    </div>
                  )}
                </div>

                {totalChecklistItems > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        completedChecklistItems === totalChecklistItems ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${(completedChecklistItems / totalChecklistItems) * 100}%` }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {taskData.checklist?.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => handleToggleChecklistItem(item._id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className={`flex-1 ${item.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}

                  <div className="flex items-center space-x-2 mt-3">
                    <input
                      type="text"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddChecklistItem();
                        }
                      }}
                      placeholder="Add checklist item..."
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddChecklistItem}
                      disabled={!newChecklistItem.trim()}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Comments ({taskData.comments?.length || 0})
                </h3>
                
                <div className="space-y-4">
                  {taskData.comments?.map((comment, index) => (
                    <div key={index} className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                        {comment.author?.firstName?.[0] || comment.author?.username?.[0] || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {comment.author?.firstName 
                              ? `${comment.author.firstName} ${comment.author.lastName}`
                              : comment.author?.username
                            }
                          </span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(comment.createdAt), 'MMM d, yyyy at h:mm a')}
                          </span>
                        </div>
                        <p className="text-gray-700">{comment.text}</p>
                      </div>
                    </div>
                  ))}

                  <div className="flex space-x-3">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm">
                      U
                    </div>
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows="3"
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleTimeTracking}
                    className={`w-full flex items-center space-x-2 p-3 rounded-lg border transition-colors duration-200 ${
                      isTimeTracking
                        ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                        : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {isTimeTracking ? <Pause size={16} /> : <Play size={16} />}
                    <span>{isTimeTracking ? 'Stop Timer' : 'Start Timer'}</span>
                  </button>

                  {isTimeTracking && timeTrackingStart && (
                    <div className="text-center text-sm text-gray-600 p-2 bg-blue-50 rounded">
                      Started: {format(timeTrackingStart, 'h:mm a')}
                    </div>
                  )}
                </div>
              </div>

              {/* Task Properties */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Properties</h3>
                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={taskData.status}
                      onChange={(e) => handleUpdateTask({ status: e.target.value })}
                      className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(taskData.status)}`}
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={taskData.priority}
                      onChange={(e) => handleUpdateTask({ priority: e.target.value })}
                      className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${getPriorityColor(taskData.priority)}`}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={taskData.dueDate ? format(new Date(taskData.dueDate), 'yyyy-MM-dd') : ''}
                      onChange={(e) => handleUpdateTask({ dueDate: e.target.value || null })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Estimated Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={taskData.estimatedHours || ''}
                      onChange={(e) => handleUpdateTask({ estimatedHours: parseFloat(e.target.value) || null })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

                  {/* Time Tracking Summary */}
                  {taskData.actualHours > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-1">Time Spent</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {taskData.actualHours.toFixed(1)}h
                      </div>
                      {taskData.estimatedHours && (
                        <div className="text-xs text-gray-500">
                          of {taskData.estimatedHours}h estimated
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Labels */}
              {taskData.labels && taskData.labels.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Labels</h3>
                  <div className="flex flex-wrap gap-2">
                    {taskData.labels.map((label, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-sm rounded-full text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Users */}
              {taskData.assignedTo && taskData.assignedTo.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Assigned To</h3>
                  <div className="space-y-2">
                    {taskData.assignedTo.map((user) => (
                      <div key={user._id} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                          {user.firstName ? user.firstName[0] : user.username[0]}
                        </div>
                        <span className="text-gray-900">
                          {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;