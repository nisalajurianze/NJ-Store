import { createContext, useContext, useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { readStorageJson, removeStorageItem, writeStorageItem } from '../utils/browserStorage';

interface CompareState {
  items: string[];
}

type CompareAction =
  | { type: 'toggle'; payload: string }
  | { type: 'set'; payload: string[] }
  | { type: 'clear' };

const compareReducer = (state: CompareState, action: CompareAction): CompareState => {
  switch (action.type) {
    case 'toggle':
      return state.items.includes(action.payload)
        ? { items: state.items.filter((item) => item !== action.payload) }
        : { items: [...state.items, action.payload].slice(0, 4) };
    case 'set':
      return { items: action.payload.slice(0, 4) };
    case 'clear':
      return { items: [] };
    default:
      return state;
  }
};

interface CompareContextValue extends CompareState {
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
}

const CompareContext = createContext<CompareContextValue | undefined>(undefined);
const COMPARE_STORAGE_KEY = 'njstore-compare';

const readStoredCompareItems = (): string[] => {
  const storedItems = readStorageJson<unknown>(COMPARE_STORAGE_KEY, []);

  if (!Array.isArray(storedItems)) {
    return [];
  }

  return storedItems.filter((item): item is string => typeof item === 'string').slice(0, 4);
};

export const CompareProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [state, dispatch] = useReducer(compareReducer, { items: [] }, () => ({
    items: readStoredCompareItems()
  }));

  useEffect(() => {
    if (state.items.length === 0) {
      removeStorageItem(COMPARE_STORAGE_KEY);
      return;
    }

    writeStorageItem(COMPARE_STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const value = useMemo(
    () => ({
      ...state,
      toggleCompare: (id: string) => {
        dispatch({ type: 'toggle', payload: id });
      },
      clearCompare: () => {
        dispatch({ type: 'clear' });
      }
    }),
    [state]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
};

export const useCompare = (): CompareContextValue => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used inside CompareProvider');
  }
  return context;
};
