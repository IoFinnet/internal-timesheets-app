import { atomFamily, atomWithObservable } from "jotai/utils";
import { switchMap } from "rxjs";

import { Name, get__internal } from "./db";
import { trigger$ } from "./trigger$";

export const atomFamily__kv = atomFamily((name: Name) => {
  return atomWithObservable(() => trigger$.pipe(switchMap(() => get__internal(name))));
});
