import React, { createContext, useContext, useState } from 'react';

const ImmersiveContext = createContext();

export const ImmersiveProvider = ({ children }) => {
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);

  const toggleImmersiveMode = () => {
    setIsImmersiveMode(prev => !prev);
  };

  return (
    <ImmersiveContext.Provider value={{ isImmersiveMode, setIsImmersiveMode, toggleImmersiveMode }}>
      {children}
    </ImmersiveContext.Provider>
  );
};

export const useImmersive = () => {
  const context = useContext(ImmersiveContext);
  if (!context) {
    return { isImmersiveMode: false, setIsImmersiveMode: () => {}, toggleImmersiveMode: () => {} };
  }
  return context;
};
