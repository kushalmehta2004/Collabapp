import React, { useState, useEffect } from 'react';
import { X, Archive, RotateCcw, Trash2 } from 'lucide-react';
import listService from '../../services/listService';
import toast from 'react-hot-toast';

const ArchivedLists = ({ boardId, onClose, onRestoreList, onDeleteList }) => {
  const [archivedLists, setArchivedLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedLists();
  }, [boardId]);

  const fetchArchivedLists = async () => {
    try {
      setLoading(true);
      const response = await listService.getArchivedLists(boardId);
      setArchivedLists(response.lists || []);
    } catch (error) {
      console.error('Fetch archived lists error:', error);
      toast.error('Failed to load archived lists');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreList = async (listId) => {
    try {
      await listService.archiveList(listId); // This will unarchive it
      setArchivedLists(archivedLists.filter(list => list._id !== listId));
      onRestoreList && onRestoreList(listId);
      toast.success('List restored successfully');
    } catch (error) {
      console.error('Restore list error:', error);
      toast.error('Failed to restore list');
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Are you sure you want to permanently delete this list? This action cannot be undone.')) {
      return;
    }

    try {
      await listService.deleteList(listId);
      setArchivedLists(archivedLists.filter(list => list._id !== listId));
      onDeleteList && onDeleteList(listId);
      toast.success('List deleted permanently');
    } catch (error) {
      console.error('Delete list error:', error);
      toast.error('Failed to delete list');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Archive className="text-gray-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">Archived Lists</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : archivedLists.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Archived Lists</h3>
              <p className="text-gray-600">Lists you archive will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {archivedLists.map((list) => (
                <div
                  key={list._id}
                  className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{list.title}</h3>
                    <p className="text-sm text-gray-600">
                      Archived on {new Date(list.updatedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {list.tasks?.length || 0} tasks
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRestoreList(list._id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                      title="Restore list"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteList(list._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      title="Delete permanently"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchivedLists;