'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { X, LoaderCircle } from 'lucide-react';

interface FileType {
  item_id: string;
  name: string;
  mime_type: string | null;
}

interface FilePreviewModalProps {
  file: FileType;
  onClose: () => void;
}

export default function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileContent = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      try {
        const response = await axios.get(
          `http://localhost:8000/files/${file.item_id}/shareable-link`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const { signedUrl } = response.data;
        setFileUrl(signedUrl);

        if (file.mime_type?.startsWith('text/')) {
          const textResponse = await axios.get(signedUrl);
          setTextContent(textResponse.data);
        }
      } catch (err) {
        console.error("Failed to get file URL", err);
        setError("Could not load file preview.");
      } finally {
        setIsLoading(false);
      }
    };

    if (file?.item_id) {
        fetchFileContent();
    }
  }, [file]);

  const renderPreview = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full"><LoaderCircle className="animate-spin w-12 h-12 text-blue-600" /></div>;
    }
    if (error || !fileUrl) {
      return <div className="text-center text-red-500">{error || "Could not load file."}</div>;
    }

    if (file.mime_type?.startsWith('image/')) {
      return <img src={fileUrl} alt={file.name} className="max-w-full max-h-[80vh] object-contain mx-auto" />;
    }
    if (file.mime_type === 'application/pdf') {
      return <iframe src={fileUrl} className="w-full h-[80vh]" title={file.name}></iframe>;
    }
    if (file.mime_type?.startsWith('text/')) {
      return <pre className="w-full h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 overflow-auto rounded-md text-sm">{textContent}</pre>;
    }
    
    return <div className="text-center text-gray-600 dark:text-gray-400">Preview not available for this file type.</div>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold truncate dark:text-gray-200">{file.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </header>
        <main className="p-4 flex-grow overflow-auto">
          {renderPreview()}
        </main>
      </div>
    </div>
  );
}