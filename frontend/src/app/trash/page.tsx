'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { File, Folder, Trash2, RotateCcw, Home, LoaderCircle } from 'lucide-react';

interface ItemType { id: string; name: string; }

export default function TrashPage() {
  const [items, setItems] = useState<{ files: ItemType[], folders: ItemType[] }>({ files: [], folders: [] });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchTrash = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('authToken');
    if (!token) { router.push('/login'); return; }
    try {
      const response = await axios.get('http://localhost:8000/trash', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to load trash.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);
  
  const handleAction = async (id: string, type: 'file' | 'folder', action: 'restore' | 'permanent') => {
    if (action === 'permanent' && !window.confirm('This is irreversible. Are you sure?')) return;
    
    const token = localStorage.getItem('authToken');
    const url = `http://localhost:8000/${type}s/${id}/${action}`;
    const toastId = toast.loading(`${action === 'restore' ? 'Restoring' : 'Deleting'}...`);
    
    try {
      action === 'restore' 
        ? await axios.patch(url, {}, { headers: { 'Authorization': `Bearer ${token}` } })
        : await axios.delete(url, { headers: { 'Authorization': `Bearer ${token}` } });
      
      toast.success(`Item ${action === 'restore' ? 'restored' : 'deleted'}!`, { id: toastId });
      fetchTrash(); // Refresh the list
    } catch (error) {
      toast.error(`Failed to ${action}.`, { id: toastId });
    }
  };

  const renderItemList = (list: ItemType[], type: 'folder' | 'file') => {
    return list.map(item => (
      <li key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3 truncate">
          {type === 'folder' 
            ? <Folder className="w-6 h-6 text-gray-500 dark:text-gray-400 flex-shrink-0" /> 
            : <File className="w-6 h-6 text-gray-500 dark:text-gray-400 flex-shrink-0" />}
          <span className="text-gray-800 dark:text-gray-200 truncate">{item.name}</span>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <button onClick={() => handleAction(item.id, type, 'restore')} className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-800 dark:text-green-500 dark:hover:text-green-400">
            <RotateCcw className="w-4 h-4" /> Restore
          </button>
          <button onClick={() => handleAction(item.id, type, 'permanent')} className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400">
            <Trash2 className="w-4 h-4" /> Delete Forever
          </button>
        </div>
      </li>
    ));
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">Trash</h1>
        <Link href="/dashboard" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2">
          <Home className="w-4 h-4" /> Back to Drive
        </Link>
      </header>
      <main className="p-4 md:p-8">
        {isLoading ? (
          <div className="flex justify-center mt-8"><LoaderCircle className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="space-y-6">
            {items.folders.length > 0 && <ul className="space-y-3">{renderItemList(items.folders, 'folder')}</ul>}
            {items.files.length > 0 && <ul className="space-y-3">{renderItemList(items.files, 'file')}</ul>}
            {items.folders.length === 0 && items.files.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400">Trash is empty.</p>}
          </div>
        )}
      </main>
    </div>
  );
}