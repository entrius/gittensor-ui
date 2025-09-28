import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useOnNavigate = (callback: () => void) => {
  const { pathname } = useLocation();
  useEffect(() => {
    callback();
  }, [callback, pathname]);
};

export default useOnNavigate;
