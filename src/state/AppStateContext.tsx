import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { AppState } from '../data/types';
import { materializeRecurring } from '../data/selectors';
import { Action, initialState, reducer } from './reducer';
import { saveState } from './persistence';

interface AppStateContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({
  initial,
  children,
}: { initial?: AppState; children: React.ReactNode }) {
  // Normalize persisted state (older versions might lack some fields)
  const seed: AppState = initial
    ? {
        ...initial,
        recurring: initial.recurring ?? [],
        customCategories: initial.customCategories ?? [],
        currency: initial.currency ?? 'MXN',
        biometricLock: initial.biometricLock ?? false,
      }
    : initialState(false);
  const [state, dispatch] = useReducer(reducer, seed);
  const materializedRef = useRef(false);

  // Materialize recurring rules on first mount (auto-generate due transactions)
  useEffect(() => {
    if (materializedRef.current) return;
    materializedRef.current = true;
    if (state.recurring.length === 0) return;
    const { newTxs, updatedRules } = materializeRecurring(state.recurring);
    if (newTxs.length > 0) {
      dispatch({ type: 'APPLY_MATERIALIZATION', newTxs, updatedRules });
    }
  }, [state.recurring]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
