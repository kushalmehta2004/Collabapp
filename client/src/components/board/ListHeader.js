import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, GripVertical } from 'lucide-react';

const ListHeader = ({ list, dragHandleProps, onDeleteList, onArchiveList, onUpdateTitle }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const handleSave = () => {
    if (title.trim() && title !== list.title && onUpdateTitle) {
      onUpdateTitle(list._id, title.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTitle(list.title);
      setIsEditing(false);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Update title when list prop changes
  useEffect(() => {
    setTitle(list.title);
  }, [list.title]);

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2 flex-1">
        <div 
          {...dragHandleProps} 
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} className="text-gray-400 hover:text-gray-600" />
        </div>
        
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyPress}
            className="font-semibold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1"
            autoFocus
          />
        ) : (
          <h3
            className="font-semibold text-gray-900 cursor-pointer hover:text-gray-700 flex-1"
            onClick={() => setIsEditing(true)}
          >
            {list.title}
          </h3>
        )}
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 rounded hover:bg-gray-200 transition-colors duration-200"
        >
          <MoreHorizontal size={16} className="text-gray-500" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-[150px]">
            <button
              onClick={() => {
                setIsEditing(true);
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Edit List
            </button>
            <button
              onClick={() => {
                if (onArchiveList) {
                  onArchiveList(list._id);
                }
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Archive List
            </button>
            <hr className="my-1" />
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
                  if (onDeleteList) {
                    onDeleteList(list._id);
                  }
                }
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Delete List
            </button>
          </div>
        )}
      </div>

      {/* Task count */}
      <div className="ml-2 text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-1">
        {list.tasks?.length || 0}
      </div>
    </div>
  );
};

export default ListHeader;