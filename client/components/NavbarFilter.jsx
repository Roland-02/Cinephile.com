import React, { createContext, useContext, useState } from 'react';

const FilterContext = createContext();

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within FilterProvider');
  }
  return context;
};

export const FilterProvider = ({ children }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const toggleFilter = () => {
    setIsFilterOpen(prev => !prev);
  };

  const closeFilter = () => {
    setIsFilterOpen(false);
  };

  return (
    <FilterContext.Provider value={{ isFilterOpen, toggleFilter, closeFilter }}>
      {children}
    </FilterContext.Provider>
  );
};

const NavbarFilter = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`mobile-filter-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Slide-out filter menu from left */}
      <div
        className={`mobile-filter-menu ${isOpen ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-filter-header">
          <h2>Filters</h2>
          <button onClick={onClose} className="mobile-filter-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
            </svg>
          </button>
        </div>
        <div className="mobile-filter-contents">
          {children}
        </div>
      </div>
    </>
  );
};

export default NavbarFilter;
