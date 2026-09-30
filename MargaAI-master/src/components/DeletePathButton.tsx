'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeletePathButton({ domain }: { domain: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the path "${domain.replace('_', ' ').replace('-', ' ')}"?\n\nThis will permanently remove all your progress for this topic.`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/profile/path?domain=${encodeURIComponent(domain)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // Refresh the page to show updated skills
        router.refresh();
      } else {
        alert('Failed to delete the path. Please try again.');
        setIsDeleting(false);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
      title={`Delete ${domain} path`}
      style={{ marginLeft: 'auto', cursor: isDeleting ? 'not-allowed' : 'pointer' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
        {isDeleting ? 'hourglass_empty' : 'delete'}
      </span>
    </button>
  );
}
