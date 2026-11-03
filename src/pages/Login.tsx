import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { loginSchema } from '../schemas/authSchemas';
import type { LoginFormData } from '../schemas/authSchemas';
import { DEMO_ENABLED, isDemoSession } from '../services/demoMode';
import { getDefaultRoute } from '../routes/defaultRoute';

function Brand() {
  return (
    <div className="brand" aria-label="UNEB Campus II">
      <span className="brand__mark" aria-hidden="true">U</span>
      <span>
        <strong>UNEB</strong>
        <small>Campus II · Alagoinhas</small>
      </span>
    </div>
  );
}

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { isAuthenticated, isLoading, login, loginDemo, loginDiretoAluno, loginDiretoDirecao, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedRoute = (location.state as { from?: string } | null)?.from;

  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  if (isAuthenticated && user) {
    return <Navigate to={isDemoSession() ? '/curriculo/cursos' : getDefaultRoute(user.perfis)} replace />;
  }

  const submitCredentials = handleSubmit(async (data) => {
    clearErrors('root');

    try {
      const loggedUser = await login({
        email: data.email,
        password: data.password,
        remember: data.remember,
      });

      navigate(requestedRoute ?? getDefaultRoute(loggedUser.perfis), { replace: true });
    } catch (error) {
      setError('root.server', {
        message: error instanceof Error ? error.message : 'Não foi possível realizar o login.',
      });
    }
  });

  const handleForgotPassword = () => {
    // Redireciona ou abre modal de recuperação de senha
    navigate('/recuperar-senha');
  };

  return (
    <main className="login-page">
      <section className="login-hero" aria-labelledby="login-welcome-title">
        <Brand />
        <div className="login-hero__content">
          <span className="eyebrow">Sistema acadêmico</span>
          <h1 id="login-welcome-title">Sua jornada acadêmica, mais simples.</h1>
          <p>
            Acesse informações, serviços e documentos do Campus II em um ambiente seguro e
            organizado.
          </p>
        </div>
        <p className="login-hero__footer">Universidade pública, inclusiva e transformadora.</p>
      </section>

      <section className="login-panel" aria-labelledby="login-form-title">
        <div className="login-card">
          <div className="login-card__heading">
            <span className="section-label">Acesso institucional</span>
            <h2 id="login-form-title">Entre na sua conta</h2>
            <p>Use suas credenciais institucionais para continuar.</p>
          </div>

          {errors.root?.server && (
            <div className="form-alert" role="alert">{errors.root.server.message}</div>
          )}

          <form onSubmit={submitCredentials} noValidate>
            <div className="form-group">
              <label htmlFor="email">E-mail institucional</label>
              <div className={`input-shell ${errors.email ? 'input-shell--error' : ''}`}>
                <Icon name="mail" />
                <input
                  id="email"
                  type="email"
                  disabled={isLoading}
                  autoComplete="username"
                  placeholder="seuemail@uneb.br"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="field-error" id="email-error">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="password">Senha</label>
                <button
                  className="text-button"
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className={`input-shell ${errors.password ? 'input-shell--error' : ''}`}>
                <Icon name="lock" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  disabled={isLoading}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
                <button
                  className="icon-button"
                  type="button"
                  disabled={isLoading}
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} />
                </button>
              </div>
              {errors.password && (
                <p className="field-error" id="password-error">{errors.password.message}</p>
              )}
            </div>

            <label className="checkbox-field">
              <input type="checkbox" disabled={isLoading} {...register('remember')} />
              <span>Manter meu acesso neste dispositivo</span>
            </label>

            <button className="primary-button" type="submit" disabled={isLoading}>
              {isLoading ? <><LoadingSpinner label="Validando credenciais" /> Validando...</> : 'Continuar'}
            </button>
          </form>
          <div className="demo-credentials" style={{ marginTop: '1.5rem', background: '#e0f2fe', border: '1px solid #bae6fd' }}>
            <div style={{ width: '100%' }}>
              <strong style={{ color: '#0369a1', fontSize: '0.85rem' }}>Acesso Rápido para Demonstração (Sem Login)</strong>
              <p style={{ margin: '0.35rem 0 0.75rem', fontSize: '0.76rem', color: '#075985' }}>
                Clique abaixo para entrar diretamente e testar as telas e painéis:
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="primary-button"
                  style={{ flex: '1 1 140px', minHeight: '40px', padding: '0.5rem 0.8rem', fontSize: '0.82rem', background: '#0284c7' }}
                  onClick={() => {
                    loginDiretoAluno();
                    navigate('/aluno/consulta');
                  }}
                >
                  Entrar direto como Aluno
                </button>
                <button
                  type="button"
                  className="primary-button"
                  style={{ flex: '1 1 140px', minHeight: '40px', padding: '0.5rem 0.8rem', fontSize: '0.82rem', background: '#0369a1' }}
                  onClick={() => {
                    loginDiretoDirecao();
                    navigate('/secretaria/gestao');
                  }}
                >
                  Entrar direto como Direção
                </button>
              </div>
            </div>
          </div>

          {DEMO_ENABLED && <div className="demo-credentials">
            <div>
              <strong>Acesso temporário de demonstração</strong>
              <p>Use dados fictícios para testar cursos, disciplinas e matrizes. Nenhuma informação será enviada ao servidor.</p>
              <button type="button" className="secondary-button" disabled={isLoading} onClick={() => { loginDemo(); navigate('/curriculo/cursos'); }}>
                Entrar em modo de teste
              </button>
            </div>
          </div>}


        </div>
      </section>
    </main>
  );
}