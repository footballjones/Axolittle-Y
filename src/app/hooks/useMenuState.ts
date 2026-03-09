/**
 * Custom hook for menu and panel state management
 * Extracted from App.tsx for better code organization
 */

import { useState } from 'react';

export function useMenuState() {
  const [activeModal, setActiveModal] = useState<'shop' | 'social' | 'rebirth' | 'stats' | 'settings' | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showXPBar, setShowXPBar] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showHowToPlayPanel, setShowHowToPlayPanel] = useState(false);
  const [showInventoryPanel, setShowInventoryPanel] = useState(false);
  const [showEggsPanel, setShowEggsPanel] = useState(false);
  const [decorationsTab, setDecorationsTab] = useState<'store' | 'owned'>('store');
  const [currentScreen, setCurrentScreen] = useState<'home' | 'games'>('home');
  const [shopSection, setShopSection] = useState<'coins' | 'opals' | null>(null);
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const closeAllPanels = () => {
    setShowHamburgerMenu(false);
    setShowNotifPanel(false);
    setShowHowToPlayPanel(false);
    setShowInventoryPanel(false);
    setShowEggsPanel(false);
  };

  return {
    // Modal state
    activeModal,
    setActiveModal,
    
    // Panel state
    showInfo,
    setShowInfo,
    showHamburgerMenu,
    setShowHamburgerMenu,
    showXPBar,
    setShowXPBar,
    showNotifPanel,
    setShowNotifPanel,
    showHowToPlayPanel,
    setShowHowToPlayPanel,
    showInventoryPanel,
    setShowInventoryPanel,
    showEggsPanel,
    setShowEggsPanel,
    
    // Tab/section state
    decorationsTab,
    setDecorationsTab,
    currentScreen,
    setCurrentScreen,
    shopSection,
    setShopSection,
    activeGame,
    setActiveGame,
    
    // Helper
    closeAllPanels,
  };
}
