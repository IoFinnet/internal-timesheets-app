import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { atomWithObservable } from "jotai/utils";
import { distinctUntilChanged, Observable, shareReplay } from "rxjs";

export const atom__fullscreen = atomWithObservable(() => fullscreen$, { initialValue: false });
const fullscreen$ = new Observable<boolean>((subscriber) => {
  const webview = getCurrentWebviewWindow();
  let state = false;

  function update(payload: typeof state) {
    state = payload;
    subscriber.next(state);
  }

  async function getInfo() {
    return await webview.isFullscreen();
  }

  let unlisteners: (() => void)[] = [];
  async function setupListeners() {
    return Promise.all([webview.onResized(() => getInfo().then((payload) => update(payload)))]);
  }

  setupListeners().then((listeners) => {
    unlisteners = listeners;
  });

  getInfo().then((pos) => update(pos));

  return function unsubscribe() {
    unlisteners.forEach((unlisten) => unlisten());
  };
}).pipe(
  distinctUntilChanged((a, b) => a === b),
  shareReplay(1),
);
