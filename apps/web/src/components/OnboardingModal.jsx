import React from 'react';
import Dialog from './Dialog';
import ProfileForm from './ProfileForm';
export default function OnboardingModal({ isOpen, onClose }) {
  return <Dialog open={isOpen} onClose={onClose} title="Make yourself at home"><ProfileForm onboarding onClose={onClose} /></Dialog>;
}
