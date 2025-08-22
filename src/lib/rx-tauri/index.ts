import { UnlistenFn } from "@tauri-apps/api/event";
import { Observable } from "rxjs";

export function fromTauri(getter: (listener: () => void) => Promise<UnlistenFn>): Observable<void> {
  return new Observable((subscriber) => {
    const abort = new AbortController();
    let unlisten: UnlistenFn | undefined;

    abort.signal.addEventListener("abort", () => {
      unlisten?.();
    });

    getter(() => {
      subscriber.next();
    }).then((fn) => {
      if (abort.signal.aborted) {
        fn();
        return;
      }

      unlisten = fn;
    });

    return () => {
      abort.abort();
    };
  });
}
