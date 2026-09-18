export function PlaceholderPage({ title, description }) {
  return (
    <section className="placeholder-page">
      <span className="section-label">Sistema acadêmico</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="placeholder-card"><strong>Módulo demonstrativo</strong><p>A estrutura desta rota está pronta para receber a integração com a API e o banco de dados do sistema.</p></div>
    </section>
  );
}
