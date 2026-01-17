"use client";
import { createContext, useContext, useState } from "react";

type Filters = {
  work_type?: string;
  work_flow?: string;
  priority?: string;
};

type SearchContextType = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filters: Filters;
  setFilters: (f: Filters | ((prev: Filters) => Filters)) => void;
};

const SearchContext = createContext<SearchContextType | null>(null);

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({});

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery, filters, setFilters }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used inside SearchProvider");
  return ctx;
};
