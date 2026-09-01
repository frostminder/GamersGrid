/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { SplashScreen } from './components/SplashScreen';
import { HomeScreen } from './screens/HomeScreen';

function AppContent() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center">
      <Routes>
        <Route path="/" element={<SplashScreen autoComplete={true} onComplete={() => navigate('/home')} />} />
        <Route path="/home" element={<HomeScreen />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

