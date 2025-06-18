import React, { useState, useEffect } from 'react';
import invitationService from '../services/invitationService';
import toast from 'react-hot-toast';
import LoadingSpinner from './common/LoadingSpinner';

const Invitations = ({ onInvitationCountChange }) => {
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setIsLoading(true);
      const response = await invitationService.getInvitations();
      const invitationsList = response.invitations || [];
      setInvitations(invitationsList);
      
      // Notify parent component about invitation count
      if (onInvitationCountChange) {
        onInvitationCountChange(invitationsList.length);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load invitations';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    if (processingIds.has(invitationId)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(invitationId));
      await invitationService.acceptInvitation(invitationId);
      
      // Remove the accepted invitation from the list
      const updatedInvitations = invitations.filter(inv => inv._id !== invitationId);
      setInvitations(updatedInvitations);
      
      // Update count in parent
      if (onInvitationCountChange) {
        onInvitationCountChange(updatedInvitations.length);
      }
      
      toast.success('Invitation accepted! You can now access the board.');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  const handleDeclineInvitation = async (invitationId) => {
    if (processingIds.has(invitationId)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(invitationId));
      await invitationService.declineInvitation(invitationId);
      
      // Remove the declined invitation from the list
      const updatedInvitations = invitations.filter(inv => inv._id !== invitationId);
      setInvitations(updatedInvitations);
      
      // Update count in parent
      if (onInvitationCountChange) {
        onInvitationCountChange(updatedInvitations.length);
      }
      
      toast.success('Invitation declined');
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error(error.message || 'Failed to decline invitation');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="medium" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-lg mb-2">No pending invitations</div>
        <p className="text-gray-400">You'll see board invitations here when you receive them</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Invitations</h2>
      
      {invitations.map((invitation) => (
        <div
          key={invitation._id}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-medium text-gray-900">
                  {invitation.board?.title || 'Board'}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {invitation.role}
                </span>
              </div>
              
              <p className="text-gray-600 mb-2">
                Invited by{' '}
                <span className="font-medium">
                  {invitation.invitedBy?.firstName && invitation.invitedBy?.lastName
                    ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
                    : invitation.invitedBy?.username || 'Unknown User'}
                </span>
              </p>
              
              {invitation.board?.description && (
                <p className="text-gray-500 text-sm mb-2">
                  {invitation.board.description}
                </p>
              )}
              
              <p className="text-gray-400 text-sm">
                Invited on {formatDate(invitation.createdAt)}
              </p>
            </div>
            
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => handleAcceptInvitation(invitation._id)}
                disabled={processingIds.has(invitation._id)}
                className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
              >
                {processingIds.has(invitation._id) ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span>Accepting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Accept</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => handleDeclineInvitation(invitation._id)}
                disabled={processingIds.has(invitation._id)}
                className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
              >
                {processingIds.has(invitation._id) ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span>Declining...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Decline</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Invitations;