import React, { createContext, useContext, useState, useCallback } from 'react';

const DateRangeContext = createContext();

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
};

export const DateRangeProvider = ({ children }) => {
  // Default to last 30 days
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const setDateRange = useCallback((start, end) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  const formatDateRange = useCallback(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [startDate, endDate]);

  const getDateParams = useCallback(() => {
    return {
      start_date: startDate,
      end_date: endDate
    };
  }, [startDate, endDate]);

  // Quick presets
  const setLast7Days = useCallback(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const setLast30Days = useCallback(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const setLast90Days = useCallback(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const setThisYear = useCallback(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), 0, 1);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  return (
    <DateRangeContext.Provider value={{
      startDate,
      endDate,
      setStartDate,
      setEndDate,
      setDateRange,
      formatDateRange,
      getDateParams,
      setLast7Days,
      setLast30Days,
      setLast90Days,
      setThisYear
    }}>
      {children}
    </DateRangeContext.Provider>
  );
};

export default DateRangeContext;
