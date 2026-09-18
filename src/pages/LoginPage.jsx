import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Icon } from "../components/ui/Icon";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useAuth } from "../contexts/auth-context";
import { loginSchema, mfaSchema } from "../schemas/authSchemas";

function Brand() {
  return (
    <div className="brand" aria-label="UNEB Campus II">
      <span className="brand__mark" aria-hidden="true">U</span>
      <span><strong>UNEB</strong><small>Campus II · Alagoinhas</small></span>
    </div>
  );
}

export function LoginPage() {
  const [step, setStep] = useState("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberAccess, setRememberAccess] = useState(false);
  const { isAuthenticated, isLoading, mfaChallenge, login, verifyMfa, cancelMfa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || "/";

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const mfaForm = useForm({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: "" },
  });

  if (isAuthenticated) return <Navigate to={destination} replace />;

  const submitCredentials = async (data) => {
    loginForm.clearErrors("root");
    try {
      const result = await login(data);
      if (result.requiresMfa) {
        setRememberAccess(Boolean(data.remember));
        setStep("mfa");
        window.setTimeout(() => document.getElementById("mfa-code")?.focus(), 0);
      }
    } catch (error) {
      loginForm.setError("root.server", { message: error.message });
    }
  };

  const submitMfa = async (data) => {
    mfaForm.clearErrors("root");
    try {
      await verifyMfa({ code: data.code, remember: rememberAccess });
      navigate(destination, { replace: true });
    } catch (error) {
      mfaForm.setError("root.server", { message: error.message });
      if (error.message.includes("expirou")) setStep("credentials");
    }
  };

  const goBack = () => {
    cancelMfa();
    mfaForm.reset();
    setStep("credentials");
  };

  return (
    <main className="login-page">
      <section className="login-hero" aria-labelledby="login-welcome-title">
        <Brand />
        <div className="login-hero__content">
          <span className="eyebrow">Sistema acadêmico</span>
          <h1 id="login-welcome-title">Sua jornada acadêmica, mais simples.</h1>
          <p>Acesse informações, serviços e documentos do Campus II em um ambiente seguro e organizado.</p>
        </div>
        <p className="login-hero__footer">Universidade pública, inclusiva e transformadora.</p>
      </section>

      <section className="login-panel" aria-labelledby="login-form-title">
        <div className="login-card">
          <div className="stepper" aria-label={`Etapa ${step === "credentials" ? 1 : 2} de 2`}>
            <span className="stepper__item stepper__item--active"><b>1</b><small>Credenciais</small></span>
            <span className="stepper__line" aria-hidden="true"></span>
            <span className={`stepper__item ${step === "mfa" ? "stepper__item--active" : ""}`}><b>2</b><small>Verificação</small></span>
          </div>

          {step === "credentials" ? (
            <>
              <div className="login-card__heading">
                <span className="section-label">Acesso seguro</span>
                <h2 id="login-form-title">Entre na sua conta</h2>
                <p>Use suas credenciais institucionais para continuar.</p>
              </div>

              {loginForm.formState.errors.root?.server && <div className="form-alert" role="alert">{loginForm.formState.errors.root.server.message}</div>}

              <form onSubmit={loginForm.handleSubmit(submitCredentials)} noValidate>
                <div className="form-group">
                  <label htmlFor="email">E-mail institucional</label>
                  <div className={`input-shell ${loginForm.formState.errors.email ? "input-shell--error" : ""}`}>
                    <Icon name="mail" />
                    <input id="email" type="email" autoComplete="email" placeholder="seu.nome@uneb.br" aria-invalid={Boolean(loginForm.formState.errors.email)} aria-describedby={loginForm.formState.errors.email ? "email-error" : undefined} {...loginForm.register("email")} />
                  </div>
                  {loginForm.formState.errors.email && <p className="field-error" id="email-error">{loginForm.formState.errors.email.message}</p>}
                </div>

                <div className="form-group">
                  <div className="form-label-row"><label htmlFor="password">Senha</label><button type="button" className="text-button" onClick={() => loginForm.setError("root.server", { message: "Procure a Secretaria Acadêmica para recuperar sua senha." })}>Esqueci minha senha</button></div>
                  <div className={`input-shell ${loginForm.formState.errors.password ? "input-shell--error" : ""}`}>
                    <Icon name="lock" />
                    <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Digite sua senha" aria-invalid={Boolean(loginForm.formState.errors.password)} aria-describedby={loginForm.formState.errors.password ? "password-error" : undefined} {...loginForm.register("password")} />
                    <button type="button" className="icon-button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}><Icon name={showPassword ? "eyeOff" : "eye"} /></button>
                  </div>
                  {loginForm.formState.errors.password && <p className="field-error" id="password-error">{loginForm.formState.errors.password.message}</p>}
                </div>

                <label className="checkbox-field"><input type="checkbox" {...loginForm.register("remember")} /><span>Lembrar meu acesso neste dispositivo</span></label>

                <button className="primary-button" type="submit" disabled={isLoading}>
                  {isLoading ? <><LoadingSpinner label="Validando credenciais" /> Validando...</> : <>Continuar <span aria-hidden="true">→</span></>}
                </button>
              </form>

              <div className="demo-credentials"><Icon name="shield" /><div><strong>Dados para demonstração</strong><span>E-mail: aluno@uneb.br · Senha: 123456</span></div></div>
            </>
          ) : (
            <>
              <button type="button" className="back-button" onClick={goBack}><Icon name="arrowLeft" size={18} /> Voltar</button>
              <div className="mfa-icon"><Icon name="shield" size={30} /></div>
              <div className="login-card__heading login-card__heading--center">
                <span className="section-label">Autenticação em duas etapas</span>
                <h2 id="login-form-title">Confirme que é você</h2>
                <p>Digite o código de seis números enviado para <strong>{mfaChallenge?.maskedDestination}</strong>.</p>
              </div>

              {mfaForm.formState.errors.root?.server && <div className="form-alert" role="alert">{mfaForm.formState.errors.root.server.message}</div>}

              <form onSubmit={mfaForm.handleSubmit(submitMfa)} noValidate>
                <div className="form-group">
                  <label htmlFor="mfa-code">Código de verificação</label>
                  <input className={`mfa-input ${mfaForm.formState.errors.code ? "mfa-input--error" : ""}`} id="mfa-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" aria-invalid={Boolean(mfaForm.formState.errors.code)} aria-describedby={mfaForm.formState.errors.code ? "mfa-error" : "mfa-help"} onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 6); }} {...mfaForm.register("code")} />
                  {mfaForm.formState.errors.code ? <p className="field-error" id="mfa-error">{mfaForm.formState.errors.code.message}</p> : <p className="field-help" id="mfa-help">O código expira em 5 minutos.</p>}
                </div>

                <button className="primary-button" type="submit" disabled={isLoading}>
                  {isLoading ? <><LoadingSpinner label="Verificando código" /> Verificando...</> : <>Verificar e entrar <Icon name="shield" size={18} /></>}
                </button>
              </form>

              <div className="demo-credentials"><Icon name="shield" /><div><strong>Código MFA de demonstração</strong><span>Use o código: 123456</span></div></div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
