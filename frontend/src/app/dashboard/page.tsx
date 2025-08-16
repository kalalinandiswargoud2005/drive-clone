'use client';

import CreateFolderModal from '@/components/CreateFolderModal';
import FilePreviewModal from '@/components/FilePreviewModal';
import ShareModal from '@/components/ShareModal';
import ThemeToggle from '@/components/ThemeToggle';
import UploadZone from '@/components/UploadZone';
import { useWebSocket } from '@/providers/WebSocketProvider';
import axios from 'axios';
import {
  Clock, Crown,
  File, Folder,
  FolderPlus,
  HardDrive,
  Home,
  LoaderCircle,
  LogOut,
  Search,
  Share2,
  Star,
  Trash2,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
type SortOption = 'name' | 'created_at' | 'size';

// Shape returned by /search for files and folders


interface ItemType {
  item_id: string;
  name: string;
  mime_type: string | null;
  created_at: string;
  size: number | null;
  is_starred: boolean;
}

interface BreadcrumbType {
  id: string;
  name: string;
}
interface SearchResultItem { id: string; [key: string]: any; }
function DashboardContent() {
  const [folders, setFolders] = useState<ItemType[]>([]);
  const [files, setFiles] = useState<ItemType[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFileForShare, setSelectedFileForShare] = useState<ItemType | null>(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<ItemType | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [isCreateFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ subscription_status?: string } | null>(null);
const ws = useWebSocket();
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folderId') || null;

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) { router.push('/login'); return; }
    const apiConfig = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const browseUrl = new URL('http://localhost:8000/browse');
      if (folderId) browseUrl.searchParams.append('folderId', folderId);
      
      const browsePromise = axios.get(browseUrl.toString(), apiConfig);
      const breadcrumbPromise = folderId ? axios.get(`http://localhost:8000/folders/${folderId}/breadcrumbs`, apiConfig) : Promise.resolve({ data: [] });
      const profilePromise = axios.get('http://localhost:8000/profile', apiConfig);

      const [browseResponse, breadcrumbResponse, profileResponse] = await Promise.all([browsePromise, breadcrumbPromise, profilePromise]);

      setFolders(browseResponse.data.folders);
      setFiles(browseResponse.data.files);
      setBreadcrumbs(breadcrumbResponse.data.reverse());
      setUserProfile(profileResponse.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [folderId, router]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { fetchData(); return; }
    const token = localStorage.getItem('authToken');
    if (!token) { router.push('/login'); return; }
    try {
      const response = await axios.get(`http://localhost:8000/search?q=${query}`, { headers: { Authorization: `Bearer ${token}` } });
      const normalizedFolders = response.data.folders.map((item: SearchResultItem) => ({ ...item, item_id: item.id }));
      const normalizedFiles = response.data.files.map((item: SearchResultItem) => ({ ...item, item_id: item.id }));
      setFolders(normalizedFolders);
      setFiles(normalizedFiles);
    } catch (error) {
      toast.error('Search failed.');
    }
  }, [fetchData, router]);
  
  const handleMoveToTrash = async (itemId: string, type: 'file' | 'folder') => {
    if (!window.confirm(`Are you sure you want to move this ${type} to the trash?`)) return;
    const token = localStorage.getItem('authToken');
    const url = `http://localhost:8000/${type}s/${itemId}`;
    const toastId = toast.loading(`Moving to trash...`);
    try {
      await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Moved to trash!', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error('Failed to move to trash.', { id: toastId });
    }
  };
  
  const handleToggleStar = async (item: ItemType, type: 'file' | 'folder') => {
    const token = localStorage.getItem('authToken');
    const isCurrentlyStarred = item.is_starred;
    const updateItemInState = (prevState: ItemType[]) => prevState.map((i) => (i.item_id === item.item_id ? { ...i, is_starred: !isCurrentlyStarred } : i));
    if (type === 'file') setFiles(updateItemInState); else setFolders(updateItemInState);
    try {
      if (isCurrentlyStarred) {
        await axios.delete('http://localhost:8000/stars', { headers: { Authorization: `Bearer ${token}` }, data: { resourceId: item.item_id } });
      } else {
        await axios.post('http://localhost:8000/stars', { resourceId: item.item_id, resourceType: type }, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (error) {
      toast.error('Failed to update star.');
      if (type === 'file') setFiles((prevState) => prevState.map((i) => (i.item_id === item.item_id ? { ...i, is_starred: isCurrentlyStarred } : i)));
      else setFolders((prevState) => prevState.map((i) => (i.item_id === item.item_id ? { ...i, is_starred: isCurrentlyStarred } : i)));
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('authToken');
    router.push('/login');
    toast.success('You have been signed out.');
  };
  
  const handleUpgrade = async () => {
    const token = localStorage.getItem('authToken');
    const toastId = toast.loading('Redirecting to checkout...');
    try {
      const response = await axios.post('http://localhost:8000/create-checkout-session', {}, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Could not create checkout session.', { id: toastId });
      }
    } catch (error) {
      toast.error('Could not create checkout session.', { id: toastId });
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

   useEffect(() => {
    if (ws) {
      ws.onmessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data as string);
        if (message.type === 'FILE_CREATED' && message.payload.folder_id === folderId) {
          toast.success(`New file added: ${message.payload.name}`);
          setFiles(currentFiles => [...currentFiles, message.payload]);
        }
      };
    }
  }, [ws, folderId]);
  const sortedFolders = useMemo(() => [...folders].sort((a, b) => a.name.localeCompare(b.name)), [folders]);
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      switch (sortOption) {
        case 'created_at': return new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime();
        case 'size': return (b.size ?? 0) - (a.size ?? 0);
        default: return a.name.localeCompare(b.name);
      }
    });
  }, [files, sortOption]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><LoaderCircle className="w-12 h-12 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <nav className="w-64 bg-white dark:bg-gray-800 p-4 border-r dark:border-gray-700 flex-col hidden md:flex">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-500 mb-8">Zenith Drive</h1>
        <button onClick={() => setCreateFolderModalOpen(true)} className="w-full mb-8 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 flex items-center justify-center gap-2 transition-colors">
          <FolderPlus className="w-5 h-5" />New Folder
        </button>
        <ul className="space-y-2">
          <li><Link href="/dashboard" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400"><HardDrive className="w-5 h-5" /><span>My Drive</span></Link></li>
          <li><Link href="/shared" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400"><Users className="w-5 h-5" /><span>Shared with me</span></Link></li>
          <li><Link href="/recent" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400"><Clock className="w-5 h-5" /><span>Recent</span></Link></li>
          <li><Link href="/starred" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400"><Star className="w-5 h-5" /><span>Starred</span></Link></li>
          <li><Link href="/trash" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400"><Trash2 className="w-5 h-5" /><span>Trash</span></Link></li>
        </ul>
        <div className="mt-auto">
          {userProfile?.subscription_status === 'pro' ? (
            <div className="text-center p-2 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-semibold">Zenith Pro Drive</div>
          ) : (
            <button onClick={handleUpgrade} className="w-full px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg shadow-md hover:from-yellow-500 hover:to-orange-600 flex items-center justify-center gap-2 font-semibold transition-all">
              <Crown className="w-5 h-5" />Upgrade to Pro
            </button>
          )}
        </div>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center border-b dark:border-gray-700">
          <nav>
            <ol className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <li><Link href="/dashboard" className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400"><Home className="w-4 h-4" /><span>Home</span></Link></li>
              {breadcrumbs.map((crumb) => (<li key={crumb.id} className="flex items-center space-x-2"><span>/</span><Link href={`/dashboard?folderId=${crumb.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">{crumb.name}</Link></li>))}
            </ol>
          </nav>
          <div className="flex items-center gap-4">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
              <input
  type="text"
  placeholder="Search..."
  value={searchQuery}
  onChange={(e) => handleSearch(e.target.value)}
  className="w-full pl-10 pr-4 py-2 border rounded-full bg-gray-50 focus:bg-gray focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
/>
            </div>
            <ThemeToggle />
            <button onClick={handleSignOut} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" aria-label="Sign out"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="flex justify-end items-center mb-8">
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm font-medium text-gray-600 dark:text-gray-300">Sort by:</label>
              <select id="sort" value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} className="pl-3 pr-8 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                <option value="name">Name</option>
                <option value="created_at">Date Created</option>
                <option value="size">Size</option>
              </select>
            </div>
          </div>
          <div className="mb-8"><UploadZone folderId={folderId} onUploadSuccess={fetchData} /></div>
          
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Folders</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {sortedFolders.map((folder) => (<div key={folder.item_id} className="relative group"><Link href={`/dashboard?folderId=${folder.item_id}`}><div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:ring-2 hover:ring-blue-500 cursor-pointer transition-all"><Folder className="w-16 h-16 text-blue-500" /><span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center truncate w-full">{folder.name}</span></div></Link><div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); handleToggleStar(folder, 'folder'); }} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full" aria-label="Star folder"><Star className={`w-4 h-4 ${folder.is_starred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 dark:text-gray-300'}`} /></button><button onClick={(e) => { e.stopPropagation(); handleMoveToTrash(folder.item_id, 'folder'); }} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full" aria-label="Move to trash"><Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-300" /></button></div></div>))}
          </div>

          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Files</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {sortedFiles.map((file) => (<div key={file.item_id} className="relative group p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm"><button onClick={() => setSelectedFileForPreview(file)} className="w-full h-full flex flex-col items-center"><File className="w-16 h-16 text-gray-400" /><span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center truncate w-full">{file.name}</span></button><div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); handleToggleStar(file, 'file'); }} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full" aria-label="Star file"><Star className={`w-4 h-4 ${file.is_starred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 dark:text-gray-300'}`} /></button><button onClick={(e) => { e.stopPropagation(); setSelectedFileForShare(file); }} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full" aria-label="Share file"><Share2 className="w-4 h-4 text-gray-600 dark:text-gray-300" /></button><button onClick={(e) => { e.stopPropagation(); handleMoveToTrash(file.item_id, 'file'); }} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full" aria-label="Move to trash"><Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-300" /></button></div></div>))}
          </div>
        </main>
      </div>

      {selectedFileForShare && <ShareModal fileId={selectedFileForShare.item_id} onClose={() => setSelectedFileForShare(null)} />}
      {selectedFileForPreview && <FilePreviewModal file={selectedFileForPreview} onClose={() => setSelectedFileForPreview(null)} />}
      {isCreateFolderModalOpen && <CreateFolderModal parentId={folderId} onClose={() => setCreateFolderModalOpen(false)} onSuccess={fetchData} />}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}