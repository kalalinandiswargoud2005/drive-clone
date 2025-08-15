'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { LinkIcon, Trash2, UserPlus, X } from 'lucide-react';

// Define types for clarity
interface Permission {
  id: string;
  role: 'viewer' | 'editor';
  users: {
    email: string;
  };
}

interface ShareModalProps {
  fileId: string;
  onClose: () => void;
}

export default function ShareModal({ fileId, onClose }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const token = localStorage.getItem('authToken');
  const apiConfig = useMemo(() => ({ 
    headers: { 'Authorization': `Bearer ${token}` } 
  }), [token]);

  const fetchPermissions = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:8000/files/${fileId}/permissions`, apiConfig);
      setPermissions(response.data);
    } catch (error) {
      toast.error('Could not load permissions.');
    } finally {
      setIsLoading(false);
    }
  }, [fileId, apiConfig]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handleShareWithUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter an email address.');
      return;
    }
    const toastId = toast.loading('Sharing file...');
    try {
      await axios.post(`http://localhost:8000/files/${fileId}/share`, { email: email.trim(), role }, apiConfig);
      toast.success(`File shared with ${email}`, { id: toastId });
      setEmail('');
      fetchPermissions(); // Refresh the list
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to share file.', { id: toastId });
    }
  };

  const handleGetLink = async () => {
    const toastId = toast.loading('Creating link...');
    try {
      const response = await axios.get(`http://localhost:8000/files/${fileId}/shareable-link`, apiConfig);
      await navigator.clipboard.writeText(response.data.signedUrl);
      toast.success('Link copied to clipboard!', { id: toastId });
    } catch (error) {
      toast.error('Failed to create link.', { id: toastId });
    }
  };
  
  const handleUpdatePermission = async (permissionId: string, newRole: 'viewer' | 'editor') => {
    const toastId = toast.loading('Updating permission...');
    try {
      await axios.patch(`http://localhost:8000/permissions/${permissionId}`, { role: newRole }, apiConfig);
      toast.success('Permission updated.', { id: toastId });
      fetchPermissions(); // Refresh the list
    } catch (error) {
      toast.error('Failed to update permission.', { id: toastId });
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    if (!window.confirm("Are you sure you want to remove this user's access?")) return;
    const toastId = toast.loading('Removing access...');
    try {
      await axios.delete(`http://localhost:8000/permissions/${permissionId}`, apiConfig);
      toast.success('Access removed.', { id: toastId });
      fetchPermissions(); // Refresh the list
    } catch (error) {
      toast.error('Failed to remove access.', { id: toastId });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Share File</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Close modal">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleShareWithUser} className="flex items-center gap-2 mb-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email address" className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"/>
          <select value={role} onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white">
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Share</button>
        </form>

        <hr className="my-4 dark:border-gray-600" />

        <div className="space-y-2 mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">People with access</h3>
          {isLoading ? <p className="text-sm text-gray-500">Loading...</p>
           : permissions.length > 0 ? (
            permissions.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-sm dark:text-gray-200">{p.users.email}</span>
                <div className="flex items-center gap-2">
                  <select value={p.role} onChange={(e) => handleUpdatePermission(p.id, e.target.value as 'viewer' | 'editor')} className="text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button onClick={() => handleRemovePermission(p.id)} aria-label="Remove access" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                  </button>
                </div>
              </div>
            ))
          ) : <p className="text-sm text-gray-500 dark:text-gray-400">Only you have access.</p>}
        </div>

        <div className="border-t pt-4 dark:border-gray-600">
          <button onClick={handleGetLink} className="flex items-center gap-2 w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">
            <LinkIcon className="w-5 h-5 text-gray-500" />
            <span>Get shareable link</span>
          </button>
        </div>
      </div>
    </div>
  );
}