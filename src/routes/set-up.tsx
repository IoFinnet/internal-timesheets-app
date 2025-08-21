import { Button, Container, Group, Image, List, Stack, Text, ThemeIcon } from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { IconBrandGoogle, IconCircleCheck, IconCircleDashed, IconEdit } from "@tabler/icons-react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

import { BambooHr } from "~/lib/bamboohr";
import { Google, useGoogleAuth } from "~/lib/google";

export const Route = createFileRoute("/set-up")({
  component: RouteComponent,
  beforeLoad: async () => {
    const isGoogleLinked = await Google.isSignedIn();
    const isBambooLinked = await BambooHr.isLinked();

    if (isGoogleLinked && isBambooLinked) {
      throw redirect({ to: "/" });
    }
  },
});

function RouteComponent() {
  const { signIn, isSigningIn, isSignedIn } = useGoogleAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();

  const { isSetUp } = BambooHr.useAuth();

  return (
    <Container mt={100}>
      <Stack align="center" justify="center">
        <Image
          src={colorScheme === "dark" ? "/logo-dark-mode.svg" : "/logo-light-mode.svg"}
          w={200}
          h={200}
          radius="lg"
        />

        <List
          spacing="xs"
          size="md"
          icon={
            <ThemeIcon color="blue" size={24} radius="xl">
              <IconCircleDashed size={16} />
            </ThemeIcon>
          }
        >
          <List.Item icon={isSignedIn ? <DoneIcon /> : undefined}>
            <Group>
              <Text>Link your Google account</Text>
              <Button
                color="cyan"
                size="compact-sm"
                onClick={() => signIn({ router })}
                loading={isSigningIn}
                disabled={isSignedIn}
              >
                <IconBrandGoogle size={14} />
              </Button>
            </Group>
          </List.Item>
          <List.Item icon={isSetUp ? <DoneIcon /> : undefined}>
            <Group>
              <Text>Link your BambooHR account</Text>
              <Button
                color="cyan.5"
                size="compact-sm"
                onClick={() => BambooHr.openModal()}
                disabled={!isSignedIn || isSetUp}
              >
                <IconEdit size={14} />
              </Button>
            </Group>
          </List.Item>
        </List>
      </Stack>
    </Container>
  );
}

function DoneIcon() {
  return (
    <ThemeIcon color="teal" size={24} radius="xl">
      <IconCircleCheck size={16} />
    </ThemeIcon>
  );
}
