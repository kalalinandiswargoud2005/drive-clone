'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

interface CreateFolderModalProps {
  parentId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateFolderModal({ parentId, onClose, onSuccess }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('');

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      toast.error('Folder name cannot be empty.');
      return;
    }
    const token = localStorage.getItem('authToken');
    const toastId = toast.loading('Creating folder...');
    try {
      await axios.post(
        'http://localhost:8000/folders',
        { name: folderName, parent_id: parentId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      toast.success('Folder created!', { id: toastId });
      onSuccess(); // Refresh the dashboard
      onClose();   // Close the modal
    } catch (error) {
      toast.error('Failed to create folder.', { id: toastId });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-gray-200">New Folder</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
            <X />
          </button>
        </div>
        <form onSubmit={handleCreateFolder}>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Untitled folder"
            className="w-full px-3 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 dark:bg-gray-700 dark:text-white"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}