import { createContext, useContext } from "react";

export const ClerkAvailableContext = createContext(true);
export const useClerkAvailable = () => useContext(ClerkAvailableContext);
