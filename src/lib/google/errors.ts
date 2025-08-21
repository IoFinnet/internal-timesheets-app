export class GoogleAccountNotLinkedError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message ?? "google account not linked", options);
  }
}
