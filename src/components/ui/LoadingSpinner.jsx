export function LoadingSpinner({ label = "Carregando" }) {
  return <span className="loading-spinner" role="status"><span className="sr-only">{label}</span></span>;
}
