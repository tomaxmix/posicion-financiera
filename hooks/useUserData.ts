'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { loadUserData, saveUserData, saveFunds, saveFinancialData, saveHistory, saveChildren, saveOperations, saveAlerts, saveWatchlist, saveRecurring } from '@/lib/firestore';
import { Fund, FinancialData, HistoryEntry, Child, Operation, Alert, WatchlistItem, RecurringContribution } from '@/lib/types';
import { DEFAULT_FUNDS, DEFAULT_DATA, DEFAULT_HISTORY, DEFAULT_CHILDREN } from '@/lib/defaults';

// Aportaciones mensuales fijas de Tomás (día 10 de cada mes)
const DEFAULT_RECURRING: RecurringContribution[] = [
  { id: 'R1', fundId: 'F4', fundName: 'Fidelity MSCI Wld',  amount: 0, dayOfMonth: 10, active: true },
  { id: 'R2', fundId: 'F5', fundName: 'Vanguard EM',         amount: 0, dayOfMonth: 10, active: true },
  { id: 'R3', fundId: 'F14',fundName: 'DNCA Alpha Bonds',    amount: 0, dayOfMonth: 10, active: true },
];

export function useUserData() {
  const { user } = useAuth();
  const [funds,      setFundsState]     = useState<Fund[]>(DEFAULT_FUNDS);
  const [data,       setDataState]      = useState<FinancialData>(DEFAULT_DATA);
  const [history,    setHistoryState]   = useState<HistoryEntry[]>(DEFAULT_HISTORY);
  const [children,   setChildrenState]  = useState<Child[]>(DEFAULT_CHILDREN);
  const [operations, setOperationsState]= useState<Operation[]>([]);
  const [alerts,     setAlertsState]    = useState<Alert[]>([]);
  const [watchlist,  setWatchlistState] = useState<WatchlistItem[]>([]);
  const [recurring,  setRecurringState] = useState<RecurringContribution[]>(DEFAULT_RECURRING);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const remote = await loadUserData(user.uid);
      if (remote.funds?.length)      setFundsState(remote.funds);
      if (remote.data)               setDataState(remote.data);
      if (remote.history?.length)    setHistoryState(remote.history);
      if (remote.children?.length)   setChildrenState(remote.children);
      if (remote.operations?.length) setOperationsState(remote.operations);
      if (remote.alerts?.length)     setAlertsState(remote.alerts);
      if (remote.watchlist?.length)  setWatchlistState(remote.watchlist);
      if (remote.recurring?.length)  setRecurringState(remote.recurring);

      if (!remote.funds) {
        await saveUserData(user.uid, {
          funds: DEFAULT_FUNDS, data: DEFAULT_DATA, history: DEFAULT_HISTORY,
          children: DEFAULT_CHILDREN, operations: [], alerts: [], watchlist: [],
          recurring: DEFAULT_RECURRING,
        });
      }
      setLoaded(true);
    })();
  }, [user]);

  const setFunds     = useCallback(async (f: Fund[])                    => { setFundsState(f);      if (user) await saveFunds(user.uid, f); },      [user]);
  const setData      = useCallback(async (d: FinancialData)             => { setDataState(d);       if (user) await saveFinancialData(user.uid, d); }, [user]);
  const setHistory   = useCallback(async (h: HistoryEntry[])            => { setHistoryState(h);    if (user) await saveHistory(user.uid, h); },    [user]);
  const setChildren  = useCallback(async (c: Child[])                   => { setChildrenState(c);   if (user) await saveChildren(user.uid, c); },   [user]);
  const setOperations= useCallback(async (o: Operation[])               => { setOperationsState(o); if (user) await saveOperations(user.uid, o); }, [user]);
  const setAlerts    = useCallback(async (a: Alert[])                   => { setAlertsState(a);     if (user) await saveAlerts(user.uid, a); },     [user]);
  const setWatchlist = useCallback(async (w: WatchlistItem[])           => { setWatchlistState(w);  if (user) await saveWatchlist(user.uid, w); },  [user]);
  const setRecurring = useCallback(async (r: RecurringContribution[])   => { setRecurringState(r);  if (user) await saveRecurring(user.uid, r); },  [user]);

  return {
    funds, setFunds, data, setData, history, setHistory,
    children, setChildren, operations, setOperations,
    alerts, setAlerts, watchlist, setWatchlist,
    recurring, setRecurring, loaded,
  };
}
