import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { atomWithObservable } from "jotai/utils";
import { distinctUntilChanged, Observable, shareReplay } from "rxjs";

/** @public */
export const atom__size = atomWithObservable(() => size$, { initialValue: { width: 0, height: 0 } });
const size$ = new Observable<{ width: number; height: number }>((subscriber) => {
  const webview = getCurrentWebviewWindow();
  let state = { width: 0, height: 0 };

  function update(payload: typeof state) {
    state = { ...state, ...payload };
    subscriber.next(state);
  }

  let unlisteners: (() => void)[] = [];
  async function setupListeners() {
    return Promise.all([webview.onResized(({ payload }) => update(payload))]);
  }

  setupListeners().then((listeners) => {
    unlisteners = listeners;
  });

  webview.outerSize().then((size) => update(size));

  return function unsubscribe() {
    unlisteners.forEach((unlisten) => unlisten());
  };
}).pipe(
  distinctUntilChanged((a, b) => a.width === b.width && a.height === b.height),
  shareReplay(1),
);
