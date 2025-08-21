import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import { BambooHr } from "~/lib/bamboohr";

export function BambooHrModal() {
  const { isOpen, setOpen } = BambooHr.useModal();
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      key: "",
      employeeId: "",
    },
    validators: {
      onChange: z.object({
        employeeId: z.string("invalid employee ID").regex(/^\d+$/).nonempty(),
        key: z.string("invalid API key").nonempty(),
      }),
    },
    onSubmit: async ({ value }) => {
      try {
        await BambooHr.link({ employeeId: value.employeeId, apiKey: value.key });
        setOpen(false);
      } finally {
        await router.invalidate();
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [form, isOpen]);

  return (
    <Modal opened={isOpen} onClose={() => setOpen(false)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <Stack gap="md">
          <form.Field name="employeeId">
            {(field) => {
              return (
                <TextInput
                  label="BambooHR Employee ID"
                  description="You can find your Employee ID in the URL of your BambooHR profile."
                  placeholder="Paste your BambooHR Employee ID here"
                  autoComplete="off"
                  name={field.name}
                  onChange={(evt) => field.handleChange(evt.currentTarget.value)}
                  onBlur={field.handleBlur}
                  value={field.state.value}
                  error={field.state.meta.errors.at(0)?.message}
                />
              );
            }}
          </form.Field>

          <form.Field name="key">
            {(field) => {
              return (
                <TextInput
                  label="BambooHR API Key"
                  placeholder="Paste your BambooHR API Key here"
                  autoComplete="off"
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
    </Modal>
  );
}
