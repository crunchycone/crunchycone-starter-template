import { signInEvent } from "./signin";

export function buildEvents() {
  return {
    signIn: signInEvent,
  };
}
