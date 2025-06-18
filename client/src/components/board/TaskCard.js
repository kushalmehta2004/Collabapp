import React from 'react';
import { Calendar, MessageCircle, Paperclip, CheckSquare, AlertCircle, Check } from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';

const TaskCard = ({ task, isDragging, onClick, onToggleComplete }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDueDateColor = (dueDate) => {
    if (!dueDate) return '';
    
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return 'text-red-600 bg-red-50';
    } else if (isToday(date)) {
      return 'text-orange-600 bg-orange-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  const formatDueDate = (dueDate) => {
    if (!dueDate) return '';
    
    const date = new Date(dueDate);
    if (isToday(date)) {
      return 'Today';
    }
    return format(date, 'MMM d');
  };

  const completedChecklistItems = task.checklist?.filter(item => item.isCompleted).length || 0;
  const totalChecklistItems = task.checklist?.length || 0;

  return (
    <div
      className={`bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 ${
        isDragging ? 'shadow-lg rotate-2 bg-blue-50' : ''
      } ${task.isCompleted ? 'opacity-75' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick(task);
      }}
    >
      {/* Task Header with Checkbox and Title */}
      <div className="flex items-start space-x-2 mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleComplete && onToggleComplete(task._id, !task.isCompleted);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
            task.isCompleted 
              ? 'bg-green-500 border-green-500 text-white' 
              : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
          }`}
        >
          {task.isCompleted && <Check size={12} />}
        </button>
        <h4 className={`font-medium text-gray-900 flex-1 ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>
          {task.title}
        </h4>
      </div>

      {/* Task Description */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.labels.slice(0, 3).map((label, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs rounded-full text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Task Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <div className="flex items-center space-x-2">
          {/* Priority */}
          <span className={`px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>

          {/* Due Date */}
          {task.dueDate && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${getDueDateColor(task.dueDate)}`}>
              <Calendar size={12} />
              <span>{formatDueDate(task.dueDate)}</span>
              {isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && (
                <AlertCircle size={12} className="text-red-500" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Checklist Progress */}
          {totalChecklistItems > 0 && (
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <CheckSquare size={12} />
              <span className={completedChecklistItems === totalChecklistItems ? 'text-green-600' : ''}>
                {completedChecklistItems}/{totalChecklistItems}
              </span>
            </div>
          )}

          {/* Comments Count */}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <MessageCircle size={12} />
              <span>{task.comments.length}</span>
            </div>
          )}

          {/* Attachments Count */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <Paperclip size={12} />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>

        {/* Assigned Users */}
        {task.assignedTo && task.assignedTo.length > 0 && (
          <div className="flex -space-x-1">
            {task.assignedTo.slice(0, 3).map((user) => (
              <div
                key={user._id}
                className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-white"
                title={`${user.firstName} ${user.lastName}` || user.username}
              >
                {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
              </div>
            ))}
            {task.assignedTo.length > 3 && (
              <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-white">
                +{task.assignedTo.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar for Checklist */}
      {totalChecklistItems > 0 && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                completedChecklistItems === totalChecklistItems ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${(completedChecklistItems / totalChecklistItems) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;