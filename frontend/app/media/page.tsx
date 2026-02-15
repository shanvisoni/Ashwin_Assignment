'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMe, uploadFile, getMyUploads, UploadEntry } from '@/lib/api';

export default function MediaPage() {
    const [uploads, setUploads] = useState<UploadEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        // Check auth and fetch uploads
        getMe().then((res) => {
            if (!res.ok || !res.data?.user) {
                window.location.href = '/signin';
                return;
            }
            loadUploads();
        });
    }, []);

    async function loadUploads() {
        const res = await getMyUploads();
        if (res.ok && res.data) {
            setUploads(res.data);
        }
        setLoading(false);
    }

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        const res = await uploadFile(file);
        if (res.ok) {
            // Refresh list
            await loadUploads();
            setFile(null);
            // Reset input
            const input = document.getElementById('file-input') as HTMLInputElement;
            if (input) input.value = '';
        } else {
            alert('Upload failed: ' + (res.error || 'Unknown error'));
        }
        setUploading(false);
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="flex min-h-screen flex-col bg-zinc-100 dark:bg-zinc-900">
            <header className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3">
                <div className="mx-auto flex max-w-5xl items-center justify-between">
                    <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-50 hover:underline">
                        &larr; Back to Home
                    </Link>
                    <span className="text-zinc-500">Media Gallery</span>
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl p-6">
                {/* Upload Section */}
                <div className="mb-8 rounded-xl bg-white dark:bg-zinc-800 p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                    <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Upload New Media</h2>
                    <form onSubmit={handleUpload} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label htmlFor="file-input" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Choose Image, PDF or Video
                            </label>
                            <input
                                id="file-input"
                                type="file"
                                accept="image/*,application/pdf,video/*"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-zinc-700 dark:file:text-zinc-100"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!file || uploading}
                            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </form>
                </div>

                {/* Gallery Grid */}
                <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">My Gallery</h2>
                {uploads.length === 0 ? (
                    <p className="text-zinc-500 italic">No uploads yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {uploads.map((item) => (
                            <div key={item.id} className="group relative overflow-hidden rounded-lg bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700">
                                <div className="aspect-video w-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                                    {item.file_type === 'IMAGE' && (
                                        <img src={item.file_url} alt={item.file_name} className="h-full w-full object-cover" />
                                    )}
                                    {item.file_type === 'VIDEO' && (
                                        <video src={item.file_url} controls className="h-full w-full" />
                                    )}
                                    {item.file_type === 'PDF' && (
                                        <div className="text-center p-4">
                                            <div className="text-4xl mb-2">📄</div>
                                            <span className="text-sm font-medium">PDF Document</span>
                                        </div>
                                    )}
                                    {item.file_type === 'OTHER' && (
                                        <div className="text-center p-4">
                                            <div className="text-4xl mb-2">📁</div>
                                            <span className="text-sm font-medium">File</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4">
                                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2" title={item.file_name}>
                                        {item.file_name}
                                    </p>
                                    <a
                                        href={item.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400"
                                    >
                                        Open Original &rarr;
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
