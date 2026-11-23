import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { describe, expect, it } from "vitest";
import { LoginPage } from "./LoginPage";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
import { DashboardPage } from "./DashboardPage";
import { AuthProvider } from "../contexts/AuthContext";

const renderApplication = () => render(
  <MemoryRouter initialEntries={["/login"]}>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  </MemoryRouter>,
);

describe("fluxo de autenticação", () => {
  it("exibe mensagens ao enviar credenciais vazias", async () => {
    const user = userEvent.setup();
    renderApplication();

    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(await screen.findByText("Informe seu e-mail institucional.")).toBeVisible();
    expect(screen.getByText("Informe sua senha.")).toBeVisible();
  });

  it("faz login, valida o MFA e redireciona para o layout protegido", async () => {
    const user = userEvent.setup();
    renderApplication();

    await user.type(screen.getByLabelText("E-mail institucional"), "aluno@uneb.br");
    await user.type(screen.getByLabelText("Senha"), "123456");
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(await screen.findByRole("heading", { name: "Confirme que é você" })).toBeVisible();

    await user.type(screen.getByLabelText("Código de verificação"), "123456");
    await user.click(screen.getByRole("button", { name: /verificar e entrar/i }));

    expect(await screen.findByRole("heading", { name: "Olá, Maria!" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Navegação acadêmica" })).toBeVisible();
    expect(screen.getByText(/Campus II — Alagoinhas/)).toBeVisible();
  });
});
