import { get__internal, Name } from "./db";

export { set__internal as set, Name } from "./db";

export async function get(key: Name): Promise<string | undefined> {
  return get__internal(key);
}
