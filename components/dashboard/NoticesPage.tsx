



import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { DeletedItem, Notice, Role, User } from '../../types';
import { Card, processFileForStorage, formatDate, Modal, PageHeader, CameraScanModal } from '../Dashboard';
import { PlusCircleIcon, SparklesIcon, TrashIcon, CameraIcon } from '../Icons';
import { GoogleGenAI, Type } from "@google/generative-ai";

const AIGeneratorModal: React.FC<{
    onClose: () => void;
    onGenerated: (data: { title: string, content: string }) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}> = ({ onClose, onGenerated, showToast }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            showToast('Please enter a prompt for the notice.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
               model: "gemini-2.5-flash",
               contents: `Generate a notice for a housing society based on this prompt: "${prompt}"`,
               config: {
                 responseMimeType: "application/json",
                 responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      title: {
                        type: Type.STRING,
                        description: 'A concise and informative title for the notice.',
                      },
                      content: {
                        type: Type.STRING,
                        description: 'The full, well-formatted content of the notice. Use newlines for paragraphs.',
                      },
                    },
                    required: ["title", "content"],
                  },
               },
               systemInstruction: "You are an assistant for a housing society manager in Pakistan. Write clear, concise, and professional notices for residents. The tone should be formal yet friendly. Start with a salutation like 'Dear Residents,' and end with 'Sincerely, The Union Committee'.",
            });
    
            const jsonStr = response.text.trim();
            const generatedNotice = JSON.parse(jsonStr);
            onGenerated(generatedNotice);
        } catch (error) {
            console.error("AI generation failed:", error);
            showToast('Failed to generate notice. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal onClose={onClose} title="AI Notice Generator" size="xl" zIndexClass="z-[150]">
            <div className="p-6">
                <label htmlFor="ai-prompt" className="block text-sm font-medium text-slate-700">Prompt</label>
                <textarea
                    id="ai-prompt"
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Write a notice about a water shortage tomorrow from 9am to 2pm due to main pipeline repairs."
                    className="mt-1 w-full p-3 border-2 border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 bg-white text-slate-900 placeholder-slate-400"
                />
            </div>
            <div className="bg-slate-200 px-6 py-4 flex justify-end items-center rounded-b-lg">
                <button 
                    type="button" 
                    onClick={handleGenerate} 
                    disabled={isLoading}
                    className="flex items-center justify-center px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:bg-brand-300"
                >
                    {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                    ) : (
                        <>
                          <SparklesIcon className="w-5 h-5 mr-2"/>
                          Generate Notice
                        </>
                    )}
                </button>
            </div>
        </Modal>
    );
};

const NoticesPage: React.FC<{ currentUser: User, showToast: (message: string, type?: 'success' | 'error') => void }> = ({ currentUser, showToast }) => {
    const { notices, setNotices, setDeletedItems } = useData();
    const [showAddNotice, setShowAddNotice] = useState(false);
    const [showAIGenerator, setShowAIGenerator] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [noticeData, setNoticeData] = useState({ title: '', content: '' });
    const [noticeImage, setNoticeImage] = useState<File | null>(null);
    
    const handleAddNotice = async () => {
        if (!noticeData.title.trim() || !noticeData.content.trim()) {
            showToast("Title and content cannot be empty.", "error");
            return;
        }
        const imageBase64 = noticeImage ? await processFileForStorage(noticeImage) : undefined;
        const newNotice: Notice = { 
            id: `n-${Date.now()}`, 
            title: noticeData.title, 
            content: noticeData.content, 
            date: new Date().toISOString(),
            image: imageBase64,
        };
        setNotices(prev => [newNotice, ...prev]);
        handleCloseAddModal();
        showToast('Notice posted successfully!');
    };

    const handleAIGenerated = (data: { title: string, content: string }) => {
        setNoticeData(data);
        setShowAIGenerator(false);
    };

    const handleCloseAddModal = () => {
        setShowAddNotice(false);
        setNoticeData({ title: '', content: '' });
        setNoticeImage(null);
    };

    const handleDeleteNotice = (noticeId: string) => {
        if (!window.confirm("Are you sure you want to delete this notice?")) return;
        const noticeToDelete = notices.find(n => n.id === noticeId);
        if(noticeToDelete) {
             const deleted: DeletedItem = { item: noticeToDelete, type: 'notice', deletedAt: new Date().toISOString() };
             setDeletedItems(prev => [deleted, ...prev.slice(0, 9)]);
             setNotices(prev => prev.filter(n => n.id !== noticeId));
             showToast('Notice deleted.');
        }
    }

    const handleCapture = async (file: File) => {
        setNoticeImage(file);
    };
    
    const canPost = [Role.Admin, Role.Accountant].includes(currentUser.role);
    const canDelete = currentUser.role === Role.Admin;

    return (
        <div>
            {showAIGenerator && <AIGeneratorModal onClose={() => setShowAIGenerator(false)} onGenerated={handleAIGenerated} showToast={showToast} />}
            {showAddNotice && <Modal onClose={handleCloseAddModal} title="Post New Notice" size="lg">
                {showCamera && <CameraScanModal onClose={() => setShowCamera(false)} onCapture={handleCapture} />}
                <div className="p-6 space-y-4">
                    <div className="flex justify-end">
                         <button type="button" onClick={() => setShowAIGenerator(true)} className="flex items-center px-3 py-2 text-xs font-bold text-white bg-brand-500 rounded-lg hover:bg-brand-600">
                           <SparklesIcon className="w-4 h-4 mr-2"/> Generate with AI
                        </button>
                    </div>
                    <input name="title" required placeholder="Title" value={noticeData.title} onChange={(e) => setNoticeData({...noticeData, title: e.target.value})} className="w-full p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900" />
                    <textarea name="content" required rows={8} placeholder="Content" value={noticeData.content} onChange={(e) => setNoticeData({...noticeData, content: e.target.value})} className="w-full p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900" />
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Upload Image (Optional)</label>
                        <div className="flex items-center space-x-2 mt-1">
                            <input type="file" name="image" accept="image/*,application/pdf" onChange={(e) => setNoticeImage(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
                            <button type="button" onClick={() => setShowCamera(true)} className="p-2 bg-brand-100 text-brand-700 rounded-full hover:bg-brand-200" title="Scan with Camera">
                                <CameraIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-200 px-6 py-4 text-right rounded-b-lg">
                    <button onClick={handleAddNotice} className="px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-lg">Post Notice</button>
                </div>
            </Modal>}
            <PageHeader title="Notice Board" subtitle="View and manage official announcements.">
                {canPost && <button onClick={() => setShowAddNotice(true)} className="flex items-center bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-brand-700 shadow-md"><PlusCircleIcon className="w-5 h-5 mr-2" />Post Notice</button>}
            </PageHeader>
            <div className="space-y-6">
                {notices.map(notice => (
                    <Card key={notice.id}>
                        <div className="flex justify-between items-start">
                           <div>
                                <h3 className="text-xl font-bold text-slate-800">{notice.title}</h3>
                                <p className="text-sm text-slate-500 mt-1">{formatDate(notice.date)}</p>
                           </div>
                           {canDelete && <button onClick={() => handleDeleteNotice(notice.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full"><TrashIcon className="w-5 h-5"/></button> }
                        </div>
                         {notice.image && <img src={notice.image} alt={notice.title} className="mt-4 rounded-lg max-h-64 w-auto" />}
                        <p className="mt-4 text-slate-700 whitespace-pre-wrap">{notice.content}</p>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default NoticesPage;
