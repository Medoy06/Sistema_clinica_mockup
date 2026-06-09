import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
    currentPath: string;
    onNavigate: (path: string) => void;
}

export const Layout = ({ children, currentPath, onNavigate }: LayoutProps) => {
    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">
            <Sidebar currentPath={currentPath} onNavigate={onNavigate} />
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
};

