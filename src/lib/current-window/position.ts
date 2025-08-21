import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { atomWithObservable } from "jotai/utils";
import { distinctUntilChanged, Observable, shareReplay } from "rxjs";

/** @public */
export const atom__position = atomWithObservable(() => position$, { initialValue: { x: 0, y: 0 } });
const position$ = new Observable<{ x: number; y: number }>((subscriber) => {
  const webview = getCurrentWebviewWindow();
  let state = { x: 0, y: 0 };

  function update(payload: typeof state) {
    state = { ...state, ...payload };
    subscriber.next(state);
  }

  let unlisteners: (() => void)[] = [];
  async function setupListeners() {
    return Promise.all([webview.onMoved(({ payload }) => update(payload))]);
  }

  setupListeners().then((listeners) => {
    unlisteners = listeners;
  });

  webview.outerPosition().then((pos) => update(pos));

  return function unsubscribe() {
    unlisteners.forEach((unlisten) => unlisten());
  };
}).pipe(
  distinctUntilChanged((a, b) => a.x === b.x && a.y === b.y),
  shareReplay(1),
);
