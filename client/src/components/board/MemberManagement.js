import React, { useState } from 'react';
import boardService from '../../services/boardService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';

const MemberManagement = ({ board, user, onClose, onMemberUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [processingMemberId, setProcessingMemberId] = useState(null);

  // Check if current user can manage members (owner or admin)
  const canManageMembers = () => {
    if (!board || !user) return false;
    
    // Check if user is owner
    if (board.owner && board.owner._id === user._id) return true;
    
    // Check if user is admin
    const userMember = board.members?.find(m => m.user._id === user._id);
    return userMember?.role === 'admin';
  };

  // Check if current user can manage a specific member
  const canManageMember = (member) => {
    if (!board || !user) return false;
    
    // Owner can manage everyone except themselves
    if (board.owner && board.owner._id === user._id) {
      return member.user._id !== user._id;
    }
    
    // Admin can manage members and viewers, but not other admins or owner
    const currentUserMember = board.members?.find(m => m.user._id === user._id);
    if (currentUserMember?.role === 'admin') {
      // Can't manage owner
      if (board.owner && member.user._id === board.owner._id) return false;
      // Can't manage other admins
      if (member.role === 'admin') return false;
      // Can't manage themselves
      if (member.user._id === user._id) return false;
      return true;
    }
    
    return false;
  };

  const handleRoleChange = async (memberId, newRole) => {
    if (processingMemberId) return;
    
    try {
      setProcessingMemberId(memberId);
      setIsLoading(true);
      
      await boardService.updateMemberRole(board._id, memberId, newRole);
      toast.success('Member role updated successfully');
      
      // Notify parent component to refresh board data
      if (onMemberUpdate) {
        onMemberUpdate();
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error(error.response?.data?.message || 'Failed to update member role');
    } finally {
      setIsLoading(false);
      setProcessingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (processingMemberId) return;
    
    if (!window.confirm('Are you sure you want to remove this member from the board?')) {
      return;
    }
    
    try {
      setProcessingMemberId(memberId);
      setIsLoading(true);
      
      await boardService.removeMember(board._id, memberId);
      toast.success('Member removed successfully');
      
      // Notify parent component to refresh board data
      if (onMemberUpdate) {
        onMemberUpdate();
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(error.response?.data?.message || 'Failed to remove member');
    } finally {
      setIsLoading(false);
      setProcessingMemberId(null);
    }
  };

  if (!canManageMembers()) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Access Denied</h3>
            <p className="text-gray-600 mb-6">You don't have permission to manage board members.</p>
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allMembers = [
    // Owner
    ...(board.owner ? [{
      user: board.owner,
      role: 'owner',
      joinedAt: board.createdAt
    }] : []),
    // Regular members
    ...(board.members || [])
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Manage Board Members</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {allMembers.map((member) => (
              <div
                key={member.user._id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                    {member.user.firstName 
                      ? `${member.user.firstName[0]}${member.user.lastName?.[0] || ''}` 
                      : member.user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {member.user.firstName && member.user.lastName
                        ? `${member.user.firstName} ${member.user.lastName}`
                        : member.user.username}
                    </div>
                    <div className="text-sm text-gray-500">
                      {member.user.email}
                    </div>
                    <div className="text-xs text-gray-400">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Role Badge/Selector */}
                  {member.role === 'owner' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Owner
                    </span>
                  ) : canManageMember(member) ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.user._id, e.target.value)}
                      disabled={processingMemberId === member.user._id}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.role === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : member.role === 'member'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                  )}

                  {/* Remove Button */}
                  {canManageMember(member) && (
                    <button
                      onClick={() => handleRemoveMember(member.user._id)}
                      disabled={processingMemberId === member.user._id}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors duration-200"
                      title="Remove member"
                    >
                      {processingMemberId === member.user._id ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {allMembers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No members found
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberManagement;