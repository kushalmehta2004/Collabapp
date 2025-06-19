import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { throttle } from 'lodash';

const CursorTracker = ({ boardId }) => {
  const { socket } = useSelector((state) => state.socket);
  const { user } = useSelector((state) => state.auth);
  const [cursors, setCursors] = useState({});

  // Remove cursors that haven't been updated in a while
  useEffect(() => {
    const interval = setInterval(() => {
      setCursors(prevCursors => {
        const now = Date.now();
        const updatedCursors = { ...prevCursors };
        
        Object.keys(updatedCursors).forEach(userId => {
          // Remove cursor if it hasn't been updated in 10 seconds
          if (now - updatedCursors[userId].timestamp > 10000) {
            delete updatedCursors[userId];
          }
        });
        
        return updatedCursors;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket || !boardId) return;

    // Listen for cursor movements from other users
    socket.on('cursor-move', ({ userId, username, firstName, lastName, position, color }) => {
      if (userId !== user._id) {
        setCursors(prev => ({
          ...prev,
          [userId]: {
            username,
            firstName,
            lastName,
            position,
            color,
            timestamp: Date.now()
          }
        }));
      }
    });

    // Track mouse movement and emit to server
    const handleMouseMove = throttle((e) => {
      const boardElement = document.getElementById('board-container');
      if (!boardElement) return;
      
      // Get relative position within the board
      const rect = boardElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      // Generate a consistent color based on user ID
      const color = generateColorFromUserId(user._id);
      
      socket.emit('cursor-move', {
        boardId,
        userId: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        position: { x, y },
        color
      });
    }, 50); // Throttle to 50ms to reduce network traffic

    const boardElement = document.getElementById('board-container');
    if (boardElement) {
      boardElement.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      socket.off('cursor-move');
      if (boardElement) {
        boardElement.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [socket, boardId, user]);

  // Generate a consistent color based on user ID
  const generateColorFromUserId = (userId) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  return (
    <>
      {Object.entries(cursors).map(([userId, cursor]) => (
        <div
          key={userId}
          className="absolute pointer-events-none z-50 flex flex-col items-center"
          style={{
            left: `${cursor.position.x}%`,
            top: `${cursor.position.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Cursor */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: cursor.color }}
          >
            <path
              d="M5.64124 5.64124C5.25071 6.03176 5.25071 6.66493 5.64124 7.05545L12.9706 14.3848L7.05545 5.64124C6.66493 5.25071 6.03176 5.25071 5.64124 5.64124Z"
              fill="currentColor"
            />
            <path
              d="M5.64124 5.64124C5.25071 6.03176 5.25071 6.66493 5.64124 7.05545L17.0251 18.4393C17.4156 18.8299 18.0488 18.8299 18.4393 18.4393C18.8299 18.0488 18.8299 17.4156 18.4393 17.0251L7.05545 5.64124C6.66493 5.25071 6.03176 5.25071 5.64124 5.64124Z"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          
          {/* Name tag */}
          <div
            className="mt-1 px-2 py-1 rounded-md text-xs font-medium shadow-md"
            style={{
              backgroundColor: cursor.color,
              color: '#fff'
            }}
          >
            {cursor.firstName && cursor.lastName 
              ? `${cursor.firstName} ${cursor.lastName}`
              : cursor.username}
          </div>
        </div>
      ))}
    </>
  );
};

export default CursorTracker;