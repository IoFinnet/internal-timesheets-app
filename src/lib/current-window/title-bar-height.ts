import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { atomWithObservable } from "jotai/utils";
import { distinctUntilChanged, Observable, shareReplay } from "rxjs";

export const atom__titleBarHeight = atomWithObservable(() => titleBarHeight$, { initialValue: 0 });
const titleBarHeight$ = new Observable<number>((subscriber) => {
  const webview = getCurrentWebviewWindow();
  const defaultSize = 42;
  let state = 0;

  function update(payload: typeof state) {
    if (Math.abs(state - payload) > 100) {
      // likely dev tools
      return;
    }

    state = payload;
    subscriber.next(state);
  }

  async function getInfo() {
    const isDecorated = await webview.isDecorated().catch(() => true);
    if (!isDecorated) {
      return defaultSize;
    }

    try {
      const outerSize = await webview.outerSize();
      const innerSize = await webview.innerSize();
      const diff = outerSize.height - innerSize.height;
      if (diff > 0) {
        return diff;
      }

      return defaultSize;
    } catch {
      return defaultSize;
    }
  }

  let unlisteners: (() => void)[] = [];
  async function setupListeners() {
    return Promise.all([webview.onResized(() => getInfo().then((height) => update(height)))]);
  }

  getInfo().then((height) => update(height));

  setupListeners().then((listeners) => {
    unlisteners = listeners;
  });

  return function unsubscribe() {
    unlisteners.forEach((unlisten) => unlisten());
  };
}).pipe(
  distinctUntilChanged((a, b) => a === b),
  shareReplay(1),
);
