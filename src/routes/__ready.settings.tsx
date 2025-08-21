import { Box, Button, Checkbox, Container, Divider, Group, Stack, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { z } from "zod";

import { BambooHr } from "~/lib/bamboohr";
import { Google, useGoogleAuth } from "~/lib/google";
import { KV, useKV } from "~/lib/kv";
import { disableOpenAtStartup, enableOpenAtStartup, useOpenAtStartup } from "~/lib/open-at-startup";

export const Route = createFileRoute("/__ready/settings")({
  component: Settings,
});

function Settings() {
  const router = useRouter();
  const openAtStartup = useOpenAtStartup();
  const { isSignedIn } = useGoogleAuth();
  const { isSetUp } = BambooHr.useAuth();
  const processInBackground = z.stringbool().safeParse(useKV(KV.Name.processInBackground)).data;

  return (
    <Container>
      <Stack gap="md">
        <Checkbox
          label="Open at startup"
          checked={openAtStartup.isEnabled}
          onChange={async (event) => {
            if (event.currentTarget.checked) {
              await enableOpenAtStartup();
            } else {
              await disableOpenAtStartup();
            }
          }}
        />

        <Checkbox
          label="Auto-process timesheets"
          checked={processInBackground}
          onChange={async (event) => {
            await KV.set(KV.Name.processInBackground, String(event.currentTarget.checked));
          }}
        />

        <Divider />

        <WorkingHours />
        <DirectReports />

        <Divider />

        <Title order={2} size="h6">
          Accounts
        </Title>

        <Box>
          {isSignedIn ? (
            <Button onClick={() => Google.signOut({ router })} color="red.5">
              Unlink Google account
            </Button>
          ) : (
            <Button onClick={() => Google.signIn({ router })} color="blue.5">
              Link Google account
            </Button>
          )}
        </Box>

        <Box>
          {isSetUp ? (
            <Button onClick={() => BambooHr.unlink()} color="red.5">
              Unlink BambooHR account
            </Button>
          ) : (
            <Button onClick={() => BambooHr.openModal()} color="blue.5" disabled={!isSignedIn}>
              Link BambooHR account
            </Button>
          )}
        </Box>
      </Stack>
    </Container>
  );
}

const WorkingHoursSchema = z
  .string()
  .trim()
  .regex(/^\d*$/, "working hours must be a number")
  .transform((v) => (v ? Number.parseInt(v, 10) : undefined))
  .pipe(
    z
      .number()
      .min(4)
      .max(8)
      .optional()
      .transform((v) => String(v)),
  );
const DirectReportsSchema = z
  .string()
  .transform(
    (v) =>
      new Set(
        v
          .split(/,\s/)
          .map((it) => it.trim())
          .filter((it) => it.length > 0),
      ),
  )
  .pipe(z.set(z.email()).transform((v) => [...v].join(", ")));

function WorkingHours() {
  const workingHours = useKV(KV.Name.workingHours) ?? "";
  const directReports = useKV(KV.Name.directReports) ?? "";

  const form = useForm({
    defaultValues: {
      workingHours,
      directReports,
    },
    validators: {
      onChange: z.object({
        workingHours: WorkingHoursSchema,
        directReports: DirectReportsSchema,
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const workingHours = WorkingHoursSchema.parse(value.workingHours);
      const directReports = DirectReportsSchema.parse(value.directReports);

      await KV.set(KV.Name.workingHours, workingHours);
      await KV.set(KV.Name.directReports, directReports);

      notifications.show({
        color: "green.5",
        message: "Settings saved",
      });

      formApi.reset({ workingHours, directReports });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <Stack gap="md">
        <form.Field name="workingHours">
          {(field) => {
            return (
              <TextInput
                label="Working hours"
                placeholder="8"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                inputMode="numeric"
                name={field.name}
                onChange={(evt) => field.handleChange(evt.currentTarget.value)}
                onBlur={field.handleBlur}
                value={field.state.value}
                error={field.state.meta.errors.at(0)?.message}
              />
            );
          }}
        </form.Field>

        <form.Field name="directReports">
          {(field) => {
            return (
              <TextInput
                label="Direct reports"
                placeholder="someone@example.com, someone.else@example.com"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                inputMode="email"
                description="Comma-separated list of email addresses of colleagues that report to you. Meetings where only you and one of them are invited will be registered as “Admin” time on your timesheets."
                name={field.name}
                onChange={(evt) => field.handleChange(evt.currentTarget.value)}
                onBlur={field.handleBlur}
                value={field.state.value}
                error={field.state.meta.errors.at(0)?.message}
              />
            );
          }}
        </form.Field>

        <Group justify="flex-end">
          <Button type="submit">Save</Button>
        </Group>
      </Stack>
    </form>
  );
}

function DirectReports() {
  return <></>;
}
