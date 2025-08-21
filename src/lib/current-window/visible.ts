import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { atomWithObservable } from "jotai/utils";
import { distinctUntilChanged, Observable, shareReplay } from "rxjs";

export const atom__visible = atomWithObservable(() => visible$, { initialValue: true });
const visible$ = new Observable<boolean>((subscriber) => {
  const webview = getCurrentWebviewWindow();
  let state = true;

  function update(payload: typeof state) {
    state = payload;
    subscriber.next(state);
  }

  async function getInfo() {
    return await webview.isVisible();
  }

  let unlisteners: (() => void)[] = [];
  async function setupListeners() {
    return Promise.all([
      webview.onMoved(() => getInfo().then((payload) => update(payload))),
      listen("tauri://focus", () => getInfo().then((payload) => update(payload))),
    ]);
  }

  setupListeners().then((listeners) => {
    unlisteners = listeners;
  });

  getInfo().then((size) => update(size));

  return function unsubscribe() {
    unlisteners.forEach((unlisten) => unlisten());
  };
}).pipe(
  distinctUntilChanged((a, b) => a === b),
  shareReplay(1),
);
