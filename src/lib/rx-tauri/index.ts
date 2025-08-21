import { UnlistenFn } from "@tauri-apps/api/event";
import { Observable } from "rxjs";

export function fromTauri(getter: (listener: () => void) => Promise<UnlistenFn>): Observable<void> {
  return new Observable((subscriber) => {
    let unlisten: UnlistenFn;

    getter(() => {
      subscriber.next();
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten();
    };
  });
}
