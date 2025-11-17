
import React, { useState, useEffect, useRef } from 'react';
import { db, functions, storage } from '../../services/firebase.ts';
import { UploadCloud, Copy, Trash2, Loader, Check, Image as ImageIcon, X } from 'lucide-react';
import type { MediaFile, NotificationType } from '../../types.ts';
import DeleteConsultantMediaConfirmationModal from './DeleteConsultantMediaConfirmationModal.tsx';

const UPLOAD_LIMIT = 6;

interface ConsultantMediaManagerProps {
    consultantId: string;
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const MediaCard: React.FC<{
    file: MediaFile;
    onDelete: (file: MediaFile) => void;
    onCopy: (url: string) => void;
}> = ({ file, onDelete, onCopy }) => {
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

const ConsultantMediaManager: React.FC<ConsultantMediaManagerProps> = ({ consultantId, onClose, showNotification }) => {
    const [myMediaFiles, setMyMediaFiles] = useState<MediaFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<MediaFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const mediaRef = db.collection('consultants').doc(consultantId).collection('media_files').orderBy('createdAt', 'desc');
        const unsubscribe = mediaRef.onSnapshot(snapshot => {
            const files = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MediaFile));
            setMyMediaFiles(files);
            setIsLoading(false);
        }, error => {
            console.error("Error fetching media files:", error);
            showNotification("Could not load your media files.", "error");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [consultantId, showNotification]);

    const handleFileSelect = () => {
        if (myMediaFiles.length >= UPLOAD_LIMIT) {
            showNotification(`You have reached the upload limit of ${UPLOAD_LIMIT} files.`, 'error');
            return;
        }
        fileInputRef.current?.click();
    };

    const uploadToServer = async (fileDataUrl: string, fileName: string, fileType: string, fileSize: number) => {
        setIsUploading(true);
        try {
            const uploadFn = functions.httpsCallable('uploadConsultantMediaFile');
            await uploadFn({ fileDataUrl, fileName, fileType, fileSize });
            showNotification('Image uploaded successfully!', 'success');
        } catch (error: any) {
            console.error("Upload failed:", error);
            showNotification(`Upload failed: ${error.message}`, 'error');
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

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

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
            const deleteFn = functions.httpsCallable('deleteConsultantMediaFile');
            await deleteFn({
                consultantId: consultantId,
                mediaFileId: fileToDelete.id
            });
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

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                    <header className="p-6 border-b flex justify-between items-center flex-shrink-0">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800">My Media Library</h3>
                            <p className="text-gray-500 text-sm mt-1">Upload and manage images for your profile.</p>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={24} /></button>
                    </header>
                    <main className="flex-grow p-6 space-y-4 overflow-y-auto bg-gray-50/50">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="font-semibold text-blue-800">
                                Uploaded: <span className="text-xl">{myMediaFiles.length}</span> / {UPLOAD_LIMIT}
                            </p>
                            <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
                            <button onClick={handleFileSelect} disabled={isUploading || myMediaFiles.length >= UPLOAD_LIMIT} className="w-full sm:w-auto flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400">
                                {isUploading ? <Loader className="animate-spin mr-2" size={20} /> : <UploadCloud className="mr-2 h-5 w-5" />}
                                {isUploading ? 'Uploading...' : 'Upload Image'}
                            </button>
                        </div>
                        {isLoading ? (
                            <div className="flex justify-center p-16"><Loader className="animate-spin text-blue-500" /></div>
                        ) : myMediaFiles.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {myMediaFiles.map(file => (
                                    <MediaCard key={file.id} file={file} onDelete={setFileToDelete} onCopy={handleCopyToClipboard} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-lg">
                                <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-xl font-semibold">Your Media Library is Empty</h3>
                                <p>Click "Upload Image" to add your first file.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
            {fileToDelete && (
                <DeleteConsultantMediaConfirmationModal
                    file={fileToDelete}
                    onClose={() => setFileToDelete(null)}
                    onConfirm={confirmDelete}
                />
            )}
        </>
    );
};

export default ConsultantMediaManager;
