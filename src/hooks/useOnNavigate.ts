import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export const useOnNavigate = (callback: () => void) => {
  const { pathname } = useLocation();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    callbackRef.current();
  }, [pathname]);
};

export default useOnNavigate;
