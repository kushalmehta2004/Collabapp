import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, Flag } from 'lucide-react';

const AddTaskForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.title.trim()) {
      const taskData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        dueDate: formData.dueDate || undefined
      };
      onSubmit(taskData);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: ''
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 space-y-3">
      <input
        ref={inputRef}
        type="text"
        name="title"
        value={formData.title}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter task title..."
        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        maxLength={200}
        required
      />

      {showAdvanced && (
        <>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Add a description..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows="3"
            maxLength={2000}
          />

          <div className="flex space-x-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Flag size={12} className="inline mr-1" />
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={`w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${getPriorityColor(formData.priority)}`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Calendar size={12} className="inline mr-1" />
                Due Date
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={!formData.title.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm"
          >
            Add Task
          </button>
          
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200 text-sm"
          >
            {showAdvanced ? 'Less' : 'More'}
          </button>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <X size={16} />
        </button>
      </div>
    </form>
  );
};

export default AddTaskForm;