
import React, { useState, useEffect } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { X, Save, Loader, PlusCircle, Trash2, Edit, Check, Star } from 'lucide-react';
import type { Consultant, ConsultantPackage, Feature, NotificationType } from '../../types.ts';
import { v4 as uuidv4 } from 'uuid';
import { defaultPackagesData } from '../../utils/defaultConsultantPackagesData.ts';

interface PackageManagerModalProps {
    consultant: Consultant;
    packages: ConsultantPackage[];
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const PackageManagerModal: React.FC<PackageManagerModalProps> = ({ consultant, packages, onClose, showNotification }) => {
    const [editingPackage, setEditingPackage] = useState<(Omit<Partial<ConsultantPackage>, 'price'> & { price?: string | number }) | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isPopulating, setIsPopulating] = useState(false);

    useEffect(() => {
        const createDefaultPackages = async () => {
            if (!consultant) return;
            setIsPopulating(true);
            try {
                const collectionRef = db.collection('consultants').doc(consultant.id).collection('consultant_packages');
                const batch = db.batch();
                defaultPackagesData.forEach(pkg => {
                    const docRef = collectionRef.doc();
                    batch.set(docRef, {
                        ...pkg,
                        consultantId: consultant.id,
                        createdAt: FieldValue.serverTimestamp(),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                });
                await batch.commit();
                showNotification('Sample packages have been added for this consultant.', 'success', 4000);
            } catch (error: any) {
                showNotification(`Failed to create default packages: ${error.message}`, 'error');
            } finally {
                setIsPopulating(false);
            }
        };

        if (consultant && packages.length === 0 && !isPopulating) {
            createDefaultPackages();
        }
    }, [consultant, packages, showNotification, isPopulating]);

    const handleStartEditing = (pkg: ConsultantPackage | null = null) => {
        if (pkg) {
            setEditingPackage({ 
                ...pkg, 
                price: (pkg.price / 100).toString(), // Convert paise to rupees for form
                order: pkg.order || 0,
                isPopular: pkg.isPopular || false,
                durationInMinutes: pkg.durationInMinutes || 30,
                ctaText: pkg.ctaText || 'Select Plan',
            }); 
        } else {
            setEditingPackage({ name: '', price: '', features: [], order: packages.length, isPopular: false, durationInMinutes: 30, ctaText: 'Select Plan' });
        }
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingPackage) return;
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
             setEditingPackage(prev => ({ ...prev, [name]: checked }));
        } else {
            setEditingPackage(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFeatureChange = (index: number, field: keyof Feature, value: any) => {
        if (!editingPackage || !editingPackage.features) return;
        const newFeatures = [...editingPackage.features];
        const featureToUpdate = { ...newFeatures[index], [field]: value };
        newFeatures[index] = featureToUpdate;
        setEditingPackage(prev => ({ ...prev, features: newFeatures }));
    };

    const addFeature = () => {
        if (!editingPackage) return;
        const newFeature: Feature = { id: uuidv4(), text: '', type: 'included' };
        setEditingPackage(prev => ({ ...prev, features: [...(prev?.features || []), newFeature] }));
    };

    const removeFeature = (index: number) => {
        if (!editingPackage || !editingPackage.features) return;
        const newFeatures = [...editingPackage.features];
        newFeatures.splice(index, 1);
        setEditingPackage(prev => ({ ...prev, features: newFeatures }));
    };

    const handleSavePackage = async () => {
        if (!editingPackage || !editingPackage.name) {
            showNotification('Package name is required.', 'error');
            return;
        }
        
        const priceInPaise = Math.round(Number(editingPackage.price) * 100);
        if (isNaN(priceInPaise) && !editingPackage.priceText) {
            showNotification('Please enter a valid price or price text.', 'error');
            return;
        }

        const order = Number(editingPackage.order) || 0;
        const duration = Number(editingPackage.durationInMinutes) || 30;

        setIsSaving(true);
        try {
            const collectionRef = db.collection('consultants').doc(consultant.id).collection('consultant_packages');
            
            const dataToSave: Omit<ConsultantPackage, 'id' | 'createdAt' | 'consultantId'> = {
                name: editingPackage.name!,
                description: editingPackage.description || '',
                features: (editingPackage.features || []).filter(f => f.text.trim()),
                price: priceInPaise || 0,
                priceText: editingPackage.priceText || '',
                order: order,
                isPopular: editingPackage.isPopular || false,
                durationInMinutes: duration,
                ctaText: editingPackage.ctaText || 'Select Plan',
                ctaLink: editingPackage.ctaLink || '',
                updatedAt: FieldValue.serverTimestamp(),
            };

            if (editingPackage.id) {
                await collectionRef.doc(editingPackage.id).update(dataToSave);
                showNotification('Package updated!', 'success');
            } else {
                await collectionRef.add({ ...dataToSave, consultantId: consultant.id, createdAt: FieldValue.serverTimestamp() });
                showNotification('Package created!', 'success');
            }
            setEditingPackage(null);
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeletePackage = async (packageId: string) => {
        if (window.confirm('Are you sure you want to delete this package?')) {
            try {
                await db.collection('consultants').doc(consultant.id).collection('consultant_packages').doc(packageId).delete();
                showNotification('Package deleted.', 'success');
            } catch (error: any) {
                showNotification(`Error deleting package: ${error.message}`, 'error');
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">Manage Packages</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                    </div>
                    <p className="text-gray-500 mt-1">For <span className="font-semibold">{consultant.name}</span></p>
                </header>
                <main className="flex-grow p-6 space-y-4 overflow-y-auto">
                    {editingPackage ? (
                        <div className="p-4 bg-gray-50 border rounded-lg space-y-3">
                            <h4 className="font-semibold text-lg">{editingPackage.id ? 'Edit Package' : 'New Package'}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input type="text" name="name" value={editingPackage.name || ''} onChange={handleFormChange} placeholder="Package Name (e.g., Basic)" required className="w-full p-2 border rounded-md" />
                                <input type="text" name="description" value={editingPackage.description || ''} onChange={handleFormChange} placeholder="Short description" className="w-full p-2 border rounded-md" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input type="number" name="price" value={editingPackage.price || ''} onChange={handleFormChange} placeholder="Price (₹)" min="0" step="0.01" className="w-full p-2 border rounded-md" />
                                <input type="text" name="priceText" value={editingPackage.priceText || ''} onChange={handleFormChange} placeholder="Price Text (e.g., Contact for Price)" className="w-full p-2 border rounded-md" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input type="number" name="durationInMinutes" value={editingPackage.durationInMinutes || ''} onChange={handleFormChange} placeholder="Duration (mins)" className="w-full p-2 border rounded-md" />
                                <input type="number" name="order" value={editingPackage.order || ''} onChange={handleFormChange} placeholder="Display Order" className="w-full p-2 border rounded-md" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input type="text" name="ctaText" value={editingPackage.ctaText || ''} onChange={handleFormChange} placeholder="Button Text (e.g., Select Plan)" className="w-full p-2 border rounded-md" />
                                <input type="url" name="ctaLink" value={editingPackage.ctaLink || ''} onChange={handleFormChange} placeholder="Button Link (optional)" className="w-full p-2 border rounded-md" />
                            </div>
                            <div>
                                 <label className="flex items-center gap-2 p-2 border rounded-md bg-white cursor-pointer">
                                    <input type="checkbox" name="isPopular" checked={!!editingPackage.isPopular} onChange={handleFormChange} className="h-4 w-4 text-amber-500 border-gray-300 rounded focus:ring-amber-400" />
                                    <span className="text-sm font-medium">Mark as Most Popular</span>
                                </label>
                            </div>
                            <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Features Included</h5>
                                <div className="space-y-2">
                                    {(editingPackage.features || []).map((feature, index) => (
                                        <div key={feature.id || index} className="flex items-center gap-2">
                                            <input type="text" value={feature.text} onChange={e => handleFeatureChange(index, 'text', e.target.value)} placeholder="Feature description" className="flex-grow p-2 border rounded-md" />
                                            <select value={feature.type} onChange={e => handleFeatureChange(index, 'type', e.target.value)} className="p-2 border rounded-md bg-white">
                                                <option value="included">Included</option>
                                                <option value="premium">Premium</option>
                                                <option value="excluded">Excluded</option>
                                            </select>
                                            <button type="button" onClick={() => removeFeature(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addFeature} className="text-sm mt-2 text-blue-600 font-semibold flex items-center gap-1"><PlusCircle size={14}/> Add Feature</button>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button type="button" onClick={() => setEditingPackage(null)} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold" disabled={isSaving}>Cancel</button>
                                <button type="button" onClick={handleSavePackage} className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center disabled:bg-blue-400" disabled={isSaving}>
                                    {isSaving ? <Loader className="animate-spin mr-2" /> : <Save className="mr-2" />} Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => handleStartEditing()} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">
                            <PlusCircle size={20}/> Add New Package
                        </button>
                    )}

                    <div className="space-y-3 pt-4">
                        <h4 className="font-semibold text-lg">Existing Packages</h4>
                        {isPopulating ? <div className="flex justify-center py-4"><Loader className="animate-spin" /></div> : packages.length > 0 ? (
                            packages.map(pkg => (
                                <div key={pkg.id} className="bg-white p-3 border rounded-md">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">{pkg.name} - <span className="text-green-600">{pkg.priceText || `₹${(pkg.price / 100).toFixed(2)}`}</span></p>
                                            <p className="text-xs text-gray-500">Order: {pkg.order || 'N/A'} {pkg.isPopular ? ' (Popular)' : ''}</p>
                                        </div>
                                        <div className="flex items-center flex-shrink-0 ml-4">
                                            <button onClick={() => handleStartEditing(pkg)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><Edit size={16}/></button>
                                            <button onClick={() => handleDeletePackage(pkg.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    <ul className="text-xs list-none mt-2 space-y-1">
                                        {(pkg.features || []).map(f => (
                                            <li key={f.id} className="flex items-center gap-1.5">{f.type === 'premium' ? <Star size={12} className="text-amber-500"/> : f.type === 'included' ? <Check size={12} className="text-green-500"/> : <X size={12} className="text-red-500"/>} {f.text}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 italic py-4">No packages created yet.</p>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PackageManagerModal;