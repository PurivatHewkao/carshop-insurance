import { useCallback, useEffect, useState } from 'react';
import { resolveActor } from '../api/actor.js';
import { salesError } from '../api/salesApi.js';

/**
 * Loads data with loading / error state. `loader(signal)` runs again when any
 * value in `deps` changes or `reload()` is called. Old data stays on screen
 * while a reload is running.
 */
export function useSalesData(loader, deps = []) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ key: '', data: null, error: '' });
  const key = JSON.stringify([revision, ...deps]);
  useEffect(() => {
    const controller = new AbortController();
    loader(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key, data, error: '' });
      },
      (error) => {
        if (!controller.signal.aborted)
          setState({ key, data: null, error: salesError(error) });
      },
    );
    return () => controller.abort();
    // loader is an inline function; `key` already covers every input it uses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return {
    loading: state.key !== key,
    data: state.data,
    error: state.key === key ? state.error : '',
    reload,
  };
}

/** Runs a write (create / update / delete) and keeps its error message. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = useCallback(async (action) => {
    setBusy(true);
    setError('');
    try {
      return { ok: true, value: await action() };
    } catch (caught) {
      setError(salesError(caught));
      return { ok: false };
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run, clearError: () => setError('') };
}

/** Customer / seller the page acts as (see api/actor.js). */
export function useActorChoice(kind, loadOptions, resolveId) {
  const state = useSalesData(
    async (signal) => {
      const [options, actor] = await Promise.all([
        loadOptions(signal),
        resolveActor(signal),
      ]);
      return { options, actor };
    },
    [kind],
  );
  const [picked, setPicked] = useState('');
  const options = state.data?.options ?? [];
  const resolved = state.data ? resolveId(state.data.actor) : '';
  const actorId = picked || resolved || options[0]?.id || '';
  return {
    loading: state.loading,
    error: state.error,
    reload: state.reload,
    options,
    actorId,
    isStandIn: state.data?.actor.isStandIn ?? true,
    pick: setPicked,
  };
}
