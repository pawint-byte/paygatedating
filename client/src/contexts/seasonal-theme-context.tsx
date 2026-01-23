import { createContext, useContext, ReactNode } from "react";
import { SeasonalTheme, getCurrentTheme, getThemeById } from "@/lib/seasonal-themes";

interface SeasonalThemeContextType {
  theme: SeasonalTheme;
  getTheme: (id: string) => SeasonalTheme | undefined;
}

const SeasonalThemeContext = createContext<SeasonalThemeContextType | undefined>(undefined);

interface SeasonalThemeProviderProps {
  children: ReactNode;
  overrideThemeId?: string;
}

export function SeasonalThemeProvider({ children, overrideThemeId }: SeasonalThemeProviderProps) {
  const theme = overrideThemeId ? (getThemeById(overrideThemeId) || getCurrentTheme()) : getCurrentTheme();
  
  return (
    <SeasonalThemeContext.Provider value={{ theme, getTheme: getThemeById }}>
      {children}
    </SeasonalThemeContext.Provider>
  );
}

export function useSeasonalTheme() {
  const context = useContext(SeasonalThemeContext);
  if (!context) {
    throw new Error("useSeasonalTheme must be used within a SeasonalThemeProvider");
  }
  return context;
}
