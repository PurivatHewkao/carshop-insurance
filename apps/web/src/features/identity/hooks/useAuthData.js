import { useEffect, useState } from 'react';
import { authError } from '../api/auth.js';

export function useAuthData(loader) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loader(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted)
          setState({ loading: false, data, error: '' });
      },
      (error) => {
        if (!controller.signal.aborted)
          setState({ loading: false, data: null, error: authError(error) });
      },
    );
    return () => controller.abort();
  }, [loader, revision]);
  return {
    ...state,
    reload: () => {
      setState({ loading: true, data: null, error: '' });
      setRevision((value) => value + 1);
    },
  };
}
