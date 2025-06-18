import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchBoards, createBoard, deleteBoard } from '../store/slices/boardSlice';
import LoadingSpinner from './common/LoadingSpinner';
import Invitations from './Invitations';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { boards, isLoading, error } = useSelector((state) => state.boards);
  const { user } = useSelector((state) => state.auth);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState('boards');
  const [invitationCount, setInvitationCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [newBoard, setNewBoard] = useState({
    title: '',
    description: '',
    backgroundColor: '#0079bf',
    isPrivate: false,
  });

  useEffect(() => {
    dispatch(fetchBoards());
  }, [dispatch]);

  const handleCreateBoard = (e) => {
    e.preventDefault();
    if (newBoard.title.trim()) {
      dispatch(createBoard(newBoard)).then(() => {
        setNewBoard({
          title: '',
          description: '',
          backgroundColor: '#0079bf',
          isPrivate: false,
        });
        setShowCreateForm(false);
      });
    }
  };

  const handleDeleteBoard = async (boardId) => {
    try {
      await dispatch(deleteBoard(boardId)).unwrap();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete board:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading && boards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            {activeTab === 'boards' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Create New Board
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('boards')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'boards'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Boards
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 ${
                  activeTab === 'invitations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>Invitations</span>
                {invitationCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                    {invitationCount}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'boards' && (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}
            </>
          )}

          {/* Create Board Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Board</h3>
                  <form onSubmit={handleCreateBoard}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Board Title *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={newBoard.title}
                        onChange={(e) => setNewBoard({ ...newBoard, title: e.target.value })}
                        placeholder="Enter board title"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        rows="3"
                        value={newBoard.description}
                        onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                        placeholder="Enter board description (optional)"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Background Color
                      </label>
                      <input
                        type="color"
                        className="w-full h-10 border border-gray-300 rounded-md"
                        value={newBoard.backgroundColor}
                        onChange={(e) => setNewBoard({ ...newBoard, backgroundColor: e.target.value })}
                      />
                    </div>
                    
                    <div className="mb-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          checked={newBoard.isPrivate}
                          onChange={(e) => setNewBoard({ ...newBoard, isPrivate: e.target.checked })}
                        />
                        <span className="ml-2 text-sm text-gray-700">Make this board private</span>
                      </label>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md disabled:opacity-50"
                      >
                        {isLoading ? 'Creating...' : 'Create Board'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Delete Board</h3>
                  <p className="text-sm text-gray-500 text-center mb-6">
                    Are you sure you want to delete this board? This action cannot be undone and will permanently delete all lists, tasks, and board data.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteBoard(showDeleteConfirm)}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md disabled:opacity-50 transition-colors duration-200"
                    >
                      {isLoading ? 'Deleting...' : 'Delete Board'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Boards Tab Content */}
          {activeTab === 'boards' && (
            <>
              {/* Boards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {boards.map((board) => (
                  <div key={board._id} className="relative group">
                    <Link
                      to={`/board/${board._id}`}
                      className="block"
                    >
                      <div
                        className="h-32 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-4 text-white relative overflow-hidden"
                        style={{ backgroundColor: board.backgroundColor }}
                      >
                        <div className="relative z-10">
                          <h3 className="text-lg font-semibold mb-2 truncate pr-8">{board.title}</h3>
                          {board.description && (
                            <p className="text-sm opacity-90 line-clamp-2">{board.description}</p>
                          )}
                        </div>
                        
                        <div className="absolute bottom-2 right-2 text-xs opacity-75">
                          {board.isPrivate && (
                            <span className="bg-black bg-opacity-20 px-2 py-1 rounded">Private</span>
                          )}
                        </div>
                      </div>
                    </Link>
                    
                    {/* Delete Button - Show for board owners and admins */}
                    {user && board.owner && (
                      (board.owner._id === user._id) || 
                      (board.members && board.members.some(m => m.user._id === user._id && m.role === 'admin'))
                    ) && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowDeleteConfirm(board._id);
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg z-20"
                        title="Delete board"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    
                    <div className="mt-2 text-sm text-gray-600">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span>Created {formatDate(board.createdAt)}</span>
                          {board.owner && (
                            <span className="text-xs text-gray-500">
                              by {board.owner.firstName && board.owner.lastName 
                                ? `${board.owner.firstName} ${board.owner.lastName}` 
                                : board.owner.username}
                            </span>
                          )}
                        </div>
                        <span>{board.memberCount || 0} members</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {boards.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">No boards yet</div>
                  <p className="text-gray-400 mb-6">Create your first board to get started with collaboration</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                  >
                    Create Your First Board
                  </button>
                </div>
              )}
            </>
          )}

          {/* Invitations Tab */}
          {activeTab === 'invitations' && (
            <Invitations onInvitationCountChange={setInvitationCount} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;