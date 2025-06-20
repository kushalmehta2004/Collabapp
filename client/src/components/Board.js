import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { fetchBoard } from '../store/slices/boardSlice';
import LoadingSpinner from './common/LoadingSpinner';
import TaskCard from './board/TaskCard';
import ListHeader from './board/ListHeader';
import AddListForm from './board/AddListForm';
import AddTaskForm from './board/AddTaskForm';
import TaskDetailModal from './task/TaskDetailModal';
import ArchivedLists from './board/ArchivedLists';
import MemberManagement from './board/MemberManagement';

import ActivityFeed from './board/ActivityFeed';
import listService from '../services/listService';
import taskService from '../services/taskService';
import boardService from '../services/boardService';
import toast from 'react-hot-toast';
import axios from 'axios';

const Board = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentBoard, isLoading, error } = useSelector((state) => state.boards);
  const { user } = useSelector((state) => state.auth);
  const { socket } = useSelector((state) => state.socket);
  const [showAddList, setShowAddList] = useState(false);
  const [showAddTask, setShowAddTask] = useState({});
  const [boardData, setBoardData] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showArchivedLists, setShowArchivedLists] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [showCollaborators, setShowCollaborators] = useState(true);

  // Connect to socket room for this board
  useEffect(() => {
    if (socket && id) {
      // Join the board room
      socket.emit('join-board', id);
      
      // Emit user active event
      socket.emit('user-active', {
        boardId: id,
        userId: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      });
      
      // Listen for active users
      socket.on('user-active', (userData) => {
        if (userData.userId !== user._id) {
          setActiveUsers(prev => {
            // Check if user already exists in the list
            const exists = prev.some(u => u.userId === userData.userId);
            if (!exists) {
              return [...prev, {
                ...userData,
                timestamp: Date.now()
              }];
            }
            return prev.map(u => 
              u.userId === userData.userId 
                ? { ...u, timestamp: Date.now() } 
                : u
            );
          });
        }
      });
      
      // Clean up on unmount
      return () => {
        socket.emit('leave-board', id);
        socket.off('user-active');
      };
    }
  }, [socket, id, user]);

  // Connect to socket room for this board
  useEffect(() => {
    if (socket && id) {
      // Join the board room
      socket.emit('join-board', id);
      
      // Emit user active event
      socket.emit('user-active', {
        boardId: id,
        userId: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      });
      
      // Listen for active users
      socket.on('user-active', (userData) => {
        if (userData.userId !== user._id) {
          setActiveUsers(prev => {
            // Check if user already exists in the list
            const exists = prev.some(u => u.userId === userData.userId);
            if (!exists) {
              return [...prev, {
                ...userData,
                timestamp: Date.now()
              }];
            }
            return prev.map(u => 
              u.userId === userData.userId 
                ? { ...u, timestamp: Date.now() } 
                : u
            );
          });
        }
      });
      
      // Clean up on unmount
      return () => {
        socket.emit('leave-board', id);
        socket.off('user-active');
      };
    }
  }, [socket, id, user]);

  useEffect(() => {
    if (id) {
      dispatch(fetchBoard(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (currentBoard) {
      setBoardData(currentBoard);
    }
  }, [currentBoard]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;



    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    try {
      if (type === 'list') {
        // Reorder lists - filter out archived lists for the operation
        const activeLists = boardData.lists.filter(list => !list.isArchived);
        const newListOrder = Array.from(activeLists);
        const [reorderedList] = newListOrder.splice(source.index, 1);
        newListOrder.splice(destination.index, 0, reorderedList);

        // Update the full lists array with the new order
        const archivedLists = boardData.lists.filter(list => list.isArchived);
        const updatedLists = [...newListOrder, ...archivedLists];

        setBoardData({
          ...boardData,
          lists: updatedLists
        });

        const listIds = newListOrder.map(list => list._id);
        await listService.reorderLists(boardData._id, listIds);
        
        toast.success('Lists reordered successfully');
      } else {
        // Move task
        const sourceList = boardData.lists.find(list => list._id === source.droppableId);
        const destList = boardData.lists.find(list => list._id === destination.droppableId);

        if (source.droppableId === destination.droppableId) {
          // Reorder within same list
          const newTasks = Array.from(sourceList.tasks);
          const [reorderedTask] = newTasks.splice(source.index, 1);
          newTasks.splice(destination.index, 0, reorderedTask);

          const newLists = boardData.lists.map(list => 
            list._id === sourceList._id 
              ? { ...list, tasks: newTasks }
              : list
          );

          setBoardData({
            ...boardData,
            lists: newLists
          });

          const taskIds = newTasks.map(task => task._id);
          await taskService.reorderTasks(sourceList._id, taskIds);
        } else {
          // Move between lists
          const sourceTasks = Array.from(sourceList.tasks);
          const destTasks = Array.from(destList.tasks);
          const [movedTask] = sourceTasks.splice(source.index, 1);
          destTasks.splice(destination.index, 0, movedTask);

          const newLists = boardData.lists.map(list => {
            if (list._id === sourceList._id) {
              return { ...list, tasks: sourceTasks };
            }
            if (list._id === destList._id) {
              return { ...list, tasks: destTasks };
            }
            return list;
          });

          setBoardData({
            ...boardData,
            lists: newLists
          });

          await taskService.moveTask(
            draggableId,
            source.droppableId,
            destination.droppableId,
            destination.index
          );
        }
        
        toast.success('Task moved successfully');
      }
    } catch (error) {
      console.error('Drag and drop error:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(`Failed to update: ${error.response?.data?.message || error.message}`);
      // Revert to original state
      setBoardData(currentBoard);
    }
  };

  const handleAddList = async (title) => {
    try {
      const response = await listService.createList({
        title,
        boardId: boardData._id
      });

      setBoardData({
        ...boardData,
        lists: [...boardData.lists, { ...response.list, tasks: [] }]
      });

      setShowAddList(false);
      toast.success('List created successfully');
    } catch (error) {
      console.error('Add list error:', error);
      toast.error('Failed to create list');
    }
  };

  const handleAddTask = async (listId, taskData) => {
    try {
      const response = await listService.createTask(listId, taskData);

      const newLists = boardData.lists.map(list => 
        list._id === listId 
          ? { ...list, tasks: [...list.tasks, response.task] }
          : list
      );

      setBoardData({
        ...boardData,
        lists: newLists
      });

      setShowAddTask({ ...showAddTask, [listId]: false });
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Add task error:', error);
      toast.error('Failed to create task');
    }
  };

  const handleDeleteList = async (listId) => {
    try {
      await listService.deleteList(listId);

      const newLists = boardData.lists.filter(list => list._id !== listId);
      setBoardData({
        ...boardData,
        lists: newLists
      });

      toast.success('List deleted successfully');
    } catch (error) {
      console.error('Delete list error:', error);
      toast.error('Failed to delete list');
    }
  };

  const handleArchiveList = async (listId) => {
    try {
      const response = await listService.archiveList(listId);

      const newLists = boardData.lists.map(list => 
        list._id === listId 
          ? { ...list, isArchived: response.list.isArchived }
          : list
      );

      setBoardData({
        ...boardData,
        lists: newLists
      });

      const action = response.list.isArchived ? 'archived' : 'unarchived';
      toast.success(`List ${action} successfully`);
    } catch (error) {
      console.error('Archive list error:', error);
      toast.error('Failed to archive list');
    }
  };

  const handleUpdateListTitle = async (listId, newTitle) => {
    try {
      await listService.updateList(listId, { title: newTitle });

      const newLists = boardData.lists.map(list => 
        list._id === listId 
          ? { ...list, title: newTitle }
          : list
      );

      setBoardData({
        ...boardData,
        lists: newLists
      });

      toast.success('List title updated successfully');
    } catch (error) {
      console.error('Update list title error:', error);
      toast.error('Failed to update list title');
    }
  };

  const handleToggleTaskComplete = async (taskId, isCompleted) => {
    try {
      await taskService.toggleTaskCompletion(taskId, isCompleted);

      const newLists = boardData.lists.map(list => ({
        ...list,
        tasks: list.tasks.map(task => 
          task._id === taskId 
            ? { ...task, isCompleted }
            : task
        )
      }));

      setBoardData({
        ...boardData,
        lists: newLists
      });

      toast.success(`Task ${isCompleted ? 'completed' : 'marked incomplete'}`);
    } catch (error) {
      console.error('Toggle task completion error:', error);
      toast.error('Failed to update task');
    }
  };

  const handleToggleBoardVisibility = async () => {
    try {
      const newIsPrivate = !boardData.isPrivate;
      await boardService.updateBoard(boardData._id, { isPrivate: newIsPrivate });

      setBoardData({
        ...boardData,
        isPrivate: newIsPrivate
      });

      toast.success(`Board is now ${newIsPrivate ? 'private' : 'public'}`);
    } catch (error) {
      console.error('Toggle board visibility error:', error);
      toast.error('Failed to update board visibility');
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    
    if (!inviteUsername.trim()) {
      toast.error('Username is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/invitations`, {
        boardId: boardData._id,
        username: inviteUsername.trim(),
        role: inviteRole
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success(`Invitation sent to ${inviteUsername}`);
      setShowInviteModal(false);
      setInviteUsername('');
      setInviteRole('member');
    } catch (error) {
      console.error('Invite member error:', error);
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    }
  };

  const canInviteMembers = () => {
    if (!boardData || !user) return false;
    
    // Check if user is owner
    if (boardData.owner && boardData.owner._id === user._id) return true;
    
    // Check if user is admin
    const userMember = boardData.members?.find(m => m.user._id === user._id);
    return userMember?.role === 'admin';
  };

  const refreshBoardData = () => {
    if (id) {
      dispatch(fetchBoard(id));
    }
  };

  if (isLoading) {
  return (
    <div id="board-container">


      {/* Active collaborators display */}
      {showCollaborators && activeUsers.length > 0 && (
        <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-2 z-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Active Collaborators</h3>
            <button
              onClick={() => setShowCollaborators(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {activeUsers.map(activeUser => (
              <div key={activeUser.userId} className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">
                  {activeUser.firstName && activeUser.lastName
                    ? `${activeUser.firstName} ${activeUser.lastName}`
                    : activeUser.username}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    </div>
  );
}

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Board</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!boardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Board Not Found</h2>
          <p className="text-gray-600 mb-6">The board you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{ backgroundColor: boardData.backgroundColor }}
      id="board-container"
    >

      
      {/* Active collaborators display */}
      {showCollaborators && activeUsers.length > 0 && (
        <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-2 z-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Active Collaborators</h3>
            <button 
              onClick={() => setShowCollaborators(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {activeUsers.map(activeUser => (
              <div key={activeUser.userId} className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700">
                  {activeUser.firstName && activeUser.lastName 
                    ? `${activeUser.firstName} ${activeUser.lastName}`
                    : activeUser.username}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="p-4">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{boardData.title}</h1>
              {boardData.description && (
                <p className="text-white opacity-90">{boardData.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {/* Board Members */}
              {boardData.members && boardData.members.length > 0 && (
                <div className="flex -space-x-2">
                  {[boardData.owner, ...boardData.members.map(m => m.user)].slice(0, 4).map((member, index) => (
                    <div
                      key={member._id}
                      className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm border-2 border-white"
                      title={member.firstName ? `${member.firstName} ${member.lastName}` : member.username}
                    >
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span>
                          {(member.firstName || member.username)[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                  {boardData.members.length > 3 && (
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-white">
                      +{boardData.members.length - 3}
                    </div>
                  )}
                </div>
              )}

              {/* Invite Members Button */}
              {canInviteMembers() && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  title="Invite members"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Invite</span>
                </button>
              )}

              {/* Manage Members Button */}
              {canInviteMembers() && (
                <button
                  onClick={() => setShowMemberManagement(true)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  title="Manage members"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span>Members</span>
                </button>
              )}

              <button
                onClick={handleToggleBoardVisibility}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                title={`Make board ${boardData.isPrivate ? 'public' : 'private'}`}
              >
                {boardData.isPrivate ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Private</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Public</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowArchivedLists(true)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h8a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Archived Lists</span>
              </button>
            </div>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="list">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex space-x-4 overflow-x-auto pb-4"
              >
                {boardData.lists && boardData.lists.filter(list => !list.isArchived).map((list, index) => (
                  <Draggable key={list._id} draggableId={list._id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-gray-100 rounded-lg p-4 min-w-80 max-w-80 ${
                          snapshot.isDragging ? 'shadow-lg' : ''
                        }`}
                      >
                        <ListHeader 
                          list={list}
                          dragHandleProps={provided.dragHandleProps}
                          onDeleteList={handleDeleteList}
                          onArchiveList={handleArchiveList}
                          onUpdateTitle={handleUpdateListTitle}
                        />
                        
                        <Droppable droppableId={list._id} type="task">
                          {(provided, snapshot) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className={`space-y-3 min-h-[100px] ${
                                snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''
                              }`}
                            >
                              {list.tasks && list.tasks.map((task, taskIndex) => (
                                <Draggable key={task._id} draggableId={task._id} index={taskIndex}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                    >
                                      <TaskCard 
                                        task={task} 
                                        isDragging={snapshot.isDragging}
                                        onToggleComplete={handleToggleTaskComplete}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                        
                        {showAddTask[list._id] ? (
                          <AddTaskForm
                            onSubmit={(taskData) => handleAddTask(list._id, taskData)}
                            onCancel={() => setShowAddTask({ ...showAddTask, [list._id]: false })}
                          />
                        ) : (
                          <button 
                            onClick={() => setShowAddTask({ ...showAddTask, [list._id]: true })}
                            className="w-full mt-4 p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                          >
                            + Add a task
                          </button>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                
                <div className="bg-white bg-opacity-20 rounded-lg p-4 min-w-80">
                  {showAddList ? (
                    <AddListForm
                      onSubmit={handleAddList}
                      onCancel={() => setShowAddList(false)}
                    />
                  ) : (
                    <button 
                      onClick={() => setShowAddList(true)}
                      className="w-full p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors duration-200"
                    >
                      + Add another list
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Archived Lists Modal */}
      {showArchivedLists && (
        <ArchivedLists
          boardId={boardData._id}
          onClose={() => setShowArchivedLists(false)}
          onRestoreList={(listId) => {
            // Refresh board data to show restored list
            dispatch(fetchBoard(id));
          }}
          onDeleteList={(listId) => {
            // List is permanently deleted, no need to refresh
          }}
        />
      )}

      {/* Invite Members Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            
      {/* Real-time Activity Feed */}
      <ActivityFeed boardId={id} />
      <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Invite Member</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Management Modal */}
      {showMemberManagement && (
        <MemberManagement
          board={boardData}
          user={user}
          onClose={() => setShowMemberManagement(false)}
          onMemberUpdate={refreshBoardData}
        />
      )}
      
      {/* Real-time Activity Feed */}
      <ActivityFeed boardId={id} />
    </div>
  );
};

export default Board;