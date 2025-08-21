import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Duration } from "luxon";
import { useEffect } from "react";
import { defer, switchMap, timer } from "rxjs";
import { z } from "zod";

import { BambooHr } from "~/lib/bamboohr";
import { Google } from "~/lib/google";
import { KV, useKV } from "~/lib/kv";
import { Processing } from "~/lib/processing";

export const Route = createFileRoute("/__ready")({
  component: ReadyLayout,
  beforeLoad: async () => {
    const isGoogleLinked = await Google.isSignedIn();
    const isBambooLinked = await BambooHr.isLinked();

    if (!isGoogleLinked || !isBambooLinked) {
      throw redirect({ to: "/set-up" });
    }
  },
});

function ReadyLayout() {
  const processInBackground = z.stringbool().safeParse(useKV(KV.Name.processInBackground)).data;

  useEffect(() => {
    if (!processInBackground) {
      return;
    }

    const subscription = timer(0, Duration.fromObject({ minutes: 30 }).as("milliseconds"))
      .pipe(switchMap(() => defer(() => Processing.safeCheckTimesheets())))
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [processInBackground]);

  return <Outlet />;
}
