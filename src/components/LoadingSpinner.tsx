export function LoadingSpinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <span className="loading-spinner" role="status">
      <span className="sr-only">{label}</span>
    </span>
  );
}
