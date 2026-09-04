import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminPage } from './pages/AdminPage.js';
import { MapPage } from './pages/MapPage.js';
import { RegionPage } from './pages/RegionPage.js';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');

createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        {/* Slug-based so deep links survive a committee rename. */}
        <Route path="/r/:regionSlug" element={<RegionPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<MapPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
