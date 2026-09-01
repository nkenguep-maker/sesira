import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AuthForm } from "./auth-form";

describe("AuthForm", () => {
  it("exposes password recovery from the login state", () => {
    const html = renderToStaticMarkup(<AuthForm />);

    expect(html).toContain("Mot de passe oublié ?");
    expect(html).toContain("Email professionnel");
    expect(html).toContain("Se connecter");
  });
});
