import { z } from "zod";

export const googleClientId = z
  .string("invalid Google Client ID")
  .nonempty()
  .parse(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export const googleClientSecret = z
  .string("invalid Google Client Secret")
  .nonempty()
  .parse(import.meta.env.VITE_GOOGLE_CLIENT_SECRET);
