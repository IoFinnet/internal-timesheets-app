import { Alert, Anchor, Button, Container, Group, Indicator, Popover, Stack, Text } from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { IconAlarmAverage, IconTrash } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { atomWithObservable } from "jotai/utils";
import { DateTime } from "luxon";
import { useState } from "react";
import { defer, switchMap, timer } from "rxjs";

import { db, dbSchema } from "~/lib/db";
import { useAreNotificationsGranted } from "~/lib/notifications";
import { Processing } from "~/lib/processing";

export const Route = createFileRoute("/__ready/")({
  component: Index,
});

const atom__datesInDb = atomWithObservable(() =>
  timer(0, 2000).pipe(
    switchMap(() =>
      defer(async (): Promise<readonly string[]> => {
        return db
          .select()
          .from(dbSchema.timesheetsDone)
          .then((rows) => rows.map((row) => row.date));
      }),
    ),
  ),
);

function Index() {
  const datesInDb = useAtomValue(atom__datesInDb);
  const areNotificationsGranted = useAreNotificationsGranted();
  const [opened, { close, open, toggle }] = useDisclosure(false);

  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);

  function isDateInRange(date: string): boolean {
    if (!start) {
      return false;
    }

    if (!end) {
      return date === start;
    }

    return date >= start && date <= end;
  }

  return (
    <Container>
      <Stack align="center">
        {!areNotificationsGranted && (
          <Alert title="System notifications">
            Give this app permission to send system notifications for an even better experience.
          </Alert>
        )}

        <Calendar
          getDayProps={(date) => {
            const timestamp = DateTime.fromISO(date);
            const dateStr = timestamp.toISODate()!;
            return {
              selected: isDateInRange(dateStr),
              onClick: () => {
                if (!start) {
                  setStart(dateStr);
                  setEnd(null);
                } else if (!end && dateStr >= start) {
                  setEnd(dateStr);
                } else if (!end && dateStr < start) {
                  setStart(dateStr);
                  setEnd(start);
                } else {
                  setStart(null);
                  setEnd(null);
                }
              },
            };
          }}
          renderDay={(date) => {
            const timestamp = DateTime.fromISO(date);
            return (
              <Indicator size={6} color="green.5" offset={-2} disabled={!datesInDb.includes(timestamp.toISODate()!)}>
                <div>{timestamp.day}</div>
              </Indicator>
            );
          }}
        />

        {!!start && (
          <Group gap="md">
            <Button
              size="compact-md"
              color="blue.5"
              onClick={() => Processing.safeCheckTimesheets({ startDate: start, endDate: end ?? start })}
              aria-label="Generate timesheets for relected days"
              title="Generate timesheets for relected days"
            >
              <IconAlarmAverage size={16} />
            </Button>

            <Popover trapFocus position="bottom" withArrow shadow="md" opened={opened} onChange={toggle}>
              <Popover.Target>
                <Button
                  size="compact-md"
                  color="red.5"
                  onClick={() => {
                    if (opened) {
                      Processing.safeRemoveTimesheets({ startDate: start, endDate: end ?? start });
                      close();
                    } else {
                      open();
                    }
                  }}
                  aria-label="Remove generated timesheets"
                >
                  <IconTrash size={16} />
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Text size="sm">
                  <span>Click again to remove generated timesheets</span>
                  <span> </span>
                  <span>
                    (or{" "}
                    <Anchor
                      c="red"
                      onClick={() =>
                        Processing.safeRemoveTimesheets({
                          startDate: start,
                          endDate: end ?? start,
                          includeNonGeneratedOnes: true,
                        })
                      }
                    >
                      remove all
                    </Anchor>
                  </span>
                  )
                </Text>
              </Popover.Dropdown>
            </Popover>
          </Group>
        )}
      </Stack>
    </Container>
  );
}
