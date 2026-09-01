/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { SplashScreen } from './components/SplashScreen';
import { HomeScreen } from './screens/HomeScreen';
import { AuthScreen } from './screens/AuthScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';

function AppContent() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center">
      <Routes>
        <Route path="/" element={<SplashScreen autoComplete={true} onComplete={() => navigate('/auth')} />} />
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
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

