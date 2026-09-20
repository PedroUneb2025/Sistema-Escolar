import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { getDefaultRoute } from '../routes/defaultRoute';
import { mfaSchema } from '../schemas/authSchemas';
import type { MFAFormData } from '../schemas/authSchemas';

function Brand() {
  return (
    <div className="brand" aria-label="UNEB Campus II">
      <span className="brand__mark" aria-hidden="true">U</span>
      <span><strong>UNEB</strong><small>Campus II · Alagoinhas</small></span>
    </div>
  );
}

export function MFA() {
  const { cancelMFA, isAuthenticated, isLoading, mfaChallenge, user, verifyMFA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { remember?: boolean; from?: string } | null;

  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<MFAFormData>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
  });

  if (isAuthenticated && user) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }

  if (!mfaChallenge) {
    return <Navigate to="/login" replace />;
  }

  const submitMFA = handleSubmit(async (data) => {
    clearErrors('root');

    try {
      const authenticatedUser = await verifyMFA(data.code, Boolean(routeState?.remember));
      navigate(routeState?.from || getDefaultRoute(authenticatedUser.role), { replace: true });
    } catch (error) {
      setError('root.server', {
        message: error instanceof Error ? error.message : 'Não foi possível validar o código.',
      });
    }
  });

  function returnToLogin() {
    cancelMFA();
    navigate('/login', { replace: true });
  }

  return (
    <main className="login-page">
      <section className="login-hero" aria-labelledby="mfa-welcome-title">
        <Brand />
        <div className="login-hero__content">
          <span className="eyebrow">Proteção da conta</span>
          <h1 id="mfa-welcome-title">Mais segurança para seus dados.</h1>
          <p>A verificação em duas etapas ajuda a impedir acessos não autorizados.</p>
        </div>
        <p className="login-hero__footer">Universidade pública, inclusiva e transformadora.</p>
      </section>

      <section className="login-panel" aria-labelledby="mfa-form-title">
        <div className="login-card">
          <div className="stepper" aria-label="Etapa 2 de 2">
            <span className="stepper__item stepper__item--active">
              <b>✓</b><small>Credenciais</small>
            </span>
            <span className="stepper__line stepper__line--active" aria-hidden="true" />
            <span className="stepper__item stepper__item--active">
              <b>2</b><small>Verificação</small>
            </span>
          </div>

          <button className="back-button" type="button" onClick={returnToLogin}>
            <Icon name="arrowLeft" size={18} /> Voltar ao login
          </button>

          <div className="mfa-icon"><Icon name="shield" size={30} /></div>
          <div className="login-card__heading login-card__heading--center">
            <span className="section-label">Verificação MFA</span>
            <h2 id="mfa-form-title">Confirme que é você</h2>
            <p>Digite o código de seis números enviado para <strong>{mfaChallenge.maskedDestination}</strong>.</p>
          </div>

          {errors.root?.server && (
            <div className="form-alert" role="alert">{errors.root.server.message}</div>
          )}

          <form onSubmit={submitMFA} noValidate>
            <div className="form-group">
              <label htmlFor="mfa-code">Código de verificação</label>
              <input
                id="mfa-code"
                className={`mfa-input ${errors.code ? 'mfa-input--error' : ''}`}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? 'mfa-error' : 'mfa-help'}
                {...register('code')}
              />
              {errors.code ? (
                <p className="field-error" id="mfa-error">{errors.code.message}</p>
              ) : (
                <p className="field-help" id="mfa-help">Para a demonstração, use o código 123456.</p>
              )}
            </div>

            <button className="primary-button" type="submit" disabled={isLoading}>
              {isLoading ? <><LoadingSpinner label="Verificando código" /> Verificando...</> : 'Verificar e entrar'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
