'use client';

import React, { createContext, useContext, useState } from 'react';
import PopupMessage from '@/app/components/popup/popupMessage';

const PopupContext = createContext({
  showGlobalPopup: (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _message: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _confirmation?: boolean
  ) => {},
  hidePopup: () => {},
});
export const PopupProvider = ({ children }: { children: React.ReactNode }) => {
  const [popupConfig, setPopupConfig] = useState({
    show: false,
    message: '',
    type: '',
    confirmation: false,
  });

  // Fonction pour afficher une popup
  const showGlobalPopup = (
    message: string,
    type = 'success',
    confirmation = false
  ) => {
    setPopupConfig({ show: true, message, type, confirmation });

    if (!confirmation) {
      // Démarrer le fade-out avant de masquer complètement
      setTimeout(() => {
        setPopupConfig(prevConfig => ({ ...prevConfig, fadeOut: true }));
        // Masquer la popup après l'animation de fade-out
        setTimeout(() => {
          setPopupConfig(prevConfig => ({ ...prevConfig, show: false }));
        }, 1500); // Durée de l'animation `fade-out`
      }, 1000); // Temps avant que le fade-out commence
    }
  };

  // Fonction pour masquer la popup
  const hidePopup = () => {
    setPopupConfig(prevConfig => ({ ...prevConfig, show: false }));
  };

  const value = {
    showGlobalPopup,
    hidePopup,
  };

  return (
    <PopupContext.Provider value={value}>
      <div className="flex flex-col w-full items-center justify-center h-full z-[1000]">
        {children}
        {popupConfig.show && (
          <PopupMessage
            message={popupConfig.message}
            type={popupConfig.type}
            confirmation={popupConfig.confirmation}
          />
        )}
      </div>
    </PopupContext.Provider>
  );
};

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (context === undefined) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
};
