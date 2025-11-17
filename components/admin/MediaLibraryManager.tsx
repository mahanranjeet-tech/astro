import React, { useState, useRef, useEffect, useMemo } from 'react';
import { functions } from '../../services/firebase.ts';
import { UploadCloud, Copy, Trash2, Loader, Check, Image as ImageIcon, User, Shield } from 'lucide-react';
import type { MediaFile, NotificationType, Consultant } from '../../types.ts';
import DeleteMediaConfirmationModal from './DeleteMediaConfirmationModal.tsx';
import { db, storage } from '../../services/firebase.ts';

interface MediaLibraryManagerProps {
    mediaFiles: MediaFile[];
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const MediaCard: React.FC<{
    file: MediaFile & { consultantName?: string, consultantId?: string };
    onDelete: (file: MediaFile & { consultantName?: string, consultantId?: string }) => void;
    onCopy: (url: string) => void;
    view: 'admin' | 'consultant';
}> = ({ file, onDelete, onCopy, view }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        onCopy(file.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white rounded-lg shadow border overflow-hidden group">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <img src={file.url} alt={file.name} className="w-full h-full object-contain" loading="lazy" />
            </div>
            <div className="p-3">
                <p className="text-sm font-semibold text-gray-800 truncate" title={file.name}>{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                {view === 'consultant' && file.consultantName && (
                    <p className="text-xs text-purple-600 mt-1 truncate" title={`Uploaded by: ${file.consultantName}`}>by {file.consultantName}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                    <button onClick={handleCopy} className="flex-1 text-xs flex items-center justify-center gap-1.5 py-1.5 px-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-semibold">
                        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy URL'}
                    </button>
                    <button onClick={() => onDelete(file)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full transition-colors">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const MediaLibraryManager: React.FC<MediaLibraryManagerProps> = ({ mediaFiles, showNotification }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<(MediaFile & { consultantId?: string; consultantName?: string }) | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [view, setView] = useState<'admin' | 'consultant'>('admin');
    
    const [consultantMedia, setConsultantMedia] = useState<(MediaFile & {consultantName: string, consultantId: string})[]>([]);
    const [isLoadingConsultantMedia, setIsLoadingConsultantMedia] = useState(false);

    useEffect(() => {
        if (view === 'consultant') {
            setIsLoadingConsultantMedia(true);
            const fetchConsultantMedia = async () => {
                try {
                    const consultantsSnapshot = await db.collection('consultants').get();
                    const consultantMap = new Map(consultantsSnapshot.docs.map(doc => [doc.id, (doc.data() as Consultant).name]));

                    const groupSnapshot = await db.collectionGroup('media_files').get();
                    
                    let files = groupSnapshot.docs.map(doc => {
                        const fileData = doc.data() as MediaFile;
                        const consultantId = doc.ref.parent.parent?.id;
                        if (!consultantId) return null;
                        return { 
                            ...fileData, 
                            id: doc.id, 
                            consultantId: consultantId,
                            consultantName: consultantMap.get(consultantId) || 'Unknown Consultant'
                        };
                    }).filter(Boolean) as (MediaFile & {consultantName: string, consultantId: string})[];
                    
                    files.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

                    setConsultantMedia(files);
                } catch (error) {
                    console.error("Error fetching consultant media:", error);
                    showNotification("Could not load consultant media. A Firestore index might be required.", "error", 5000);
                } finally {
                    setIsLoadingConsultantMedia(false);
                }
            };
            fetchConsultantMedia();
        }
    }, [view, showNotification]);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };
    
    const uploadToServer = async (fileDataUrl: string, fileName: string, fileType: string, fileSize: number) => {
        if (!fileDataUrl) {
            showNotification('Could not read file data.', 'error');
            return;
        }

        setIsUploading(true);
        try {
            const uploadMediaFile = functions.httpsCallable('uploadMediaFile');
            await uploadMediaFile({
                fileDataUrl,
                fileName,
                fileType,
                fileSize
            });
            showNotification('Image uploaded successfully!', 'success');
        } catch (error: any) {
            console.error("Upload failed:", error);
            showNotification(`Image upload failed: ${error.message}`, 'error');
        } finally {
            setIsUploading(false);
        }
    };


    const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'].includes(file.type)) {
            showNotification('Invalid file type. Please upload an image.', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showNotification('File is too large. Max size is 5MB.', 'error');
            return;
        }
        
        const compressibleTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (compressibleTypes.includes(file.type)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1920;
                    const MAX_HEIGHT = 1080;
                    let { width, height } = img;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        showNotification('Could not process image for compression.', 'error');
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality JPEG

                    // Estimate new size from base64 string
                    const base64Length = compressedDataUrl.length - (compressedDataUrl.indexOf(',') + 1);
                    const padding = (compressedDataUrl.slice(-2) === '==') ? 2 : ((compressedDataUrl.slice(-1) === '=') ? 1 : 0);
                    const newSize = (base64Length * 0.75) - padding;

                    const originalName = file.name.substring(0, file.name.lastIndexOf('.') || file.name.length);
                    const newFileName = `${originalName}.jpeg`;
                    
                    uploadToServer(compressedDataUrl, newFileName, 'image/jpeg', newSize);
                };
                img.onerror = () => {
                    showNotification('Could not load image for compression.', 'error');
                    setIsUploading(false);
                };
                img.src = e.target?.result as string;
            };
            reader.onerror = () => {
                showNotification('Failed to read the file for compression.', 'error');
            };
            reader.readAsDataURL(file);
        } else {
            // Not a compressible image (SVG, GIF), upload as is
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileDataUrl = e.target?.result as string;
                uploadToServer(fileDataUrl, file.name, file.type, file.size);
            };
            reader.onerror = () => {
                showNotification('Failed to read the file.', 'error');
            };
            reader.readAsDataURL(file);
        }

        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const confirmDelete = async () => {
        if (!fileToDelete) return;

        try {
            if (fileToDelete.consultantId) {
                const deleteFn = functions.httpsCallable('deleteConsultantMediaFile');
                await deleteFn({
                    consultantId: fileToDelete.consultantId,
                    mediaFileId: fileToDelete.id,
                });
            } else {
                const deleteFn = functions.httpsCallable('deleteAdminMediaFile');
                await deleteFn({ mediaFileId: fileToDelete.id });
            }
            showNotification('Image deleted successfully.', 'success');
        } catch (error: any) {
            console.error("Deletion failed:", error);
            showNotification(error.message || 'Failed to delete image.', 'error');
        } finally {
            setFileToDelete(null);
        }
    };
    
    const handleCopyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        showNotification('URL copied to clipboard!', 'success');
    };

    const renderContent = () => {
        if (view === 'admin') {
            return mediaFiles.length > 0 ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {mediaFiles.map(file => (
                        <MediaCard key={file.id} file={file} onDelete={setFileToDelete} onCopy={handleCopyToClipboard} view={view} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-lg">
                    <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold">Your Media Library is Empty</h3>
                    <p>Click "Upload Image" to add your first file.</p>
                </div>
            );
        }
        
        if (view === 'consultant') {
            if (isLoadingConsultantMedia) return <div className="flex justify-center py-16"><Loader className="animate-spin text-blue-500" /></div>;
            return consultantMedia.length > 0 ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {consultantMedia.map(file => (
                        <MediaCard key={file.id} file={file} onDelete={setFileToDelete} onCopy={handleCopyToClipboard} view={view}/>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-lg">
                    <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold">No Consultant Uploads</h3>
                    <p>Consultants have not uploaded any media files yet.</p>
                </div>
            );
        }
    };
    
    const getTabClass = (tabName: 'admin' | 'consultant') => `px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === tabName ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Media Library</h2>
                    <p className="text-gray-500 mt-1">Upload and manage images to get public URLs for use across your site.</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
                <button onClick={handleFileSelect} disabled={isUploading} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 w-full sm:w-auto">
                    {isUploading ? <Loader className="animate-spin mr-2" size={20} /> : <UploadCloud className="mr-2 h-5 w-5" />}
                    {isUploading ? `Uploading...` : 'Upload Image'}
                </button>
            </div>
             <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg self-start">
                <button onClick={() => setView('admin')} className={getTabClass('admin')}><Shield size={16} className="mr-2"/> Admin Library</button>
                <button onClick={() => setView('consultant')} className={getTabClass('consultant')}><User size={16} className="mr-2"/> Consultant Uploads</button>
            </div>
            {renderContent()}
            {fileToDelete && (
                <DeleteMediaConfirmationModal
                    file={fileToDelete}
                    onClose={() => setFileToDelete(null)}
                    onConfirm={confirmDelete}
                />
            )}
        </div>
    );
};

export default MediaLibraryManager;