import React from 'react';
import Dialog from './Dialog';
import ProfileForm from './ProfileForm';
export default function EditProfileModal({ isOpen, onClose, returnFocus }) {
  return <Dialog open={isOpen} onClose={onClose} title="Edit your profile" returnFocus={returnFocus}><ProfileForm onClose={onClose} /></Dialog>;
}
