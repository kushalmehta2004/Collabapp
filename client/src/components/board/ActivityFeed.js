import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';

const ActivityFeed = ({ boardId }) => {
  const { socket } = useSelector((state) => state.socket);
  const [activities, setActivities] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!socket || !boardId) return;

    // Listen for various activity events
    const activityTypes = [
      'task-created', 
      'task-updated', 
      'task-moved', 
      'task-deleted',
      'list-created',
      'list-updated',
      'list-moved',
      'list-archived',
      'list-restored',
      'member-joined',
      'member-left',
      'member-role-changed',
      'board-updated'
    ];

    // Register listeners for all activity types
    activityTypes.forEach(type => {
      socket.on(type, (data) => {
        if (data.boardId === boardId) {
          setActivities(prev => {
            // Keep only the latest 50 activities
            const newActivities = [
              {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                type,
                data,
                timestamp: new Date()
              },
              ...prev
            ];
            
            return newActivities.slice(0, 50);
          });
        }
      });
    });

    // Clean up listeners on unmount
    return () => {
      activityTypes.forEach(type => {
        socket.off(type);
      });
    };
  }, [socket, boardId]);

  // Format the activity message based on type
  const formatActivityMessage = (activity) => {
    const { type, data } = activity;
    const user = data.user?.username || data.username || 'Someone';
    
    switch (type) {
      case 'task-created':
        return `${user} created task "${data.task?.title || 'Untitled'}"`;
      case 'task-updated':
        return `${user} updated task "${data.task?.title || 'Untitled'}"`;
      case 'task-moved':
        return `${user} moved task "${data.task?.title || 'Untitled'}"`;
      case 'task-deleted':
        return `${user} deleted task "${data.task?.title || 'Untitled'}"`;
      case 'list-created':
        return `${user} created list "${data.list?.title || 'Untitled'}"`;
      case 'list-updated':
        return `${user} updated list "${data.list?.title || 'Untitled'}"`;
      case 'list-moved':
        return `${user} reordered list "${data.list?.title || 'Untitled'}"`;
      case 'list-archived':
        return `${user} archived list "${data.list?.title || 'Untitled'}"`;
      case 'list-restored':
        return `${user} restored list "${data.list?.title || 'Untitled'}"`;
      case 'member-joined':
        return `${user} joined the board`;
      case 'member-left':
        return `${user} left the board`;
      case 'member-role-changed':
        return `${user}'s role changed to ${data.role || 'member'}`;
      case 'board-updated':
        return `${user} updated board settings`;
      default:
        return `${user} performed an action`;
    }
  };

  // Get icon for activity type
  const getActivityIcon = (type) => {
    switch (type) {
      case 'task-created':
      case 'task-updated':
      case 'task-moved':
      case 'task-deleted':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'list-created':
      case 'list-updated':
      case 'list-moved':
      case 'list-archived':
      case 'list-restored':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'member-joined':
      case 'member-left':
      case 'member-role-changed':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'board-updated':
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (activities.length === 0 && !isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-white rounded-full p-3 shadow-lg flex items-center justify-center relative"
        >
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {activities.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activities.length > 9 ? '9+' : activities.length}
            </span>
          )}
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-xl w-80 max-h-96 flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-medium text-gray-800">Activity Feed</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="overflow-y-auto flex-1 p-3">
            {activities.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              <ul className="space-y-2">
                {activities.map((activity) => (
                  <li 
                    key={activity.id} 
                    className="flex items-start space-x-2 text-sm border-b border-gray-100 pb-2"
                  >
                    <div className="mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800">{formatActivityMessage(activity)}</p>
                      <p className="text-gray-400 text-xs">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="p-2 border-t">
            <button
              onClick={() => setActivities([])}
              className="w-full text-xs text-gray-500 hover:text-gray-700 py-1"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;