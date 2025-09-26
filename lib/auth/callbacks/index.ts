import { redirectCallback } from "./redirect";
import { jwtCallback } from "./jwt";
import { sessionCallback } from "./session";
import { signInCallback } from "./signin";

export function buildCallbacks() {
  return {
    redirect: redirectCallback,
    jwt: jwtCallback,
    session: sessionCallback,
    signIn: signInCallback,
  };
}
