import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usuarioService, type CadastrarAlunoData, type CadastrarProfessorData } from '../../services/usuarioService';
import { getApiError } from '../../services/apiError';

export function CadastroUsuario({ tipo }: { tipo: 'aluno' | 'professor' }) {
  const navigate = useNavigate();
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [dados, setDados] = useState<Record<string,string>>({});
  const aluno = tipo === 'aluno';
  const set = (key:string, value:string) => setDados(prev=>({...prev,[key]:value}));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(''); setSucesso('');
    if (!dados.email || !/^\S+@\S+\.\S+$/.test(dados.email)) { setErro('Informe um e-mail válido.'); return; }
    if ((dados.senha ?? '').length < 8) { setErro('A senha deve ter pelo menos 8 caracteres.'); return; }
    if ((dados.cpf ?? '').replace(/\D/g,'').length !== 11) { setErro('O CPF deve conter 11 dígitos.'); return; }
    if (!dados.nome_completo || dados.nome_completo.trim().length < 3) { setErro('Informe o nome completo (mínimo de 3 caracteres).'); return; }
    setEnviando(true);
    try {
      if (aluno) {
        await usuarioService.cadastrarAluno({ email:dados.email, senha:dados.senha, matricula:dados.matricula, nome_completo:dados.nome_completo, cpf:dados.cpf, data_nascimento:dados.data_nascimento, telefone:dados.telefone } as CadastrarAlunoData);
        setSucesso('Aluno cadastrado. Ele já pode entrar no sistema com o e-mail e a senha informados.');
      } else {
        await usuarioService.cadastrarProfessor({ email:dados.email, senha:dados.senha, matricula_funcional:dados.matricula_funcional, nome_completo:dados.nome_completo, cpf:dados.cpf, titulacao:dados.titulacao } as CadastrarProfessorData);
        setSucesso('Professor cadastrado com sucesso.');
      }
    } catch (err) { setErro(getApiError(err, 'Não foi possível concluir o cadastro.')); }
    finally { setEnviando(false); }
  };
  const campo = (name:string, label:string, type='text', required=true) => <label className="form-group" key={name}>{label}<input type={type} required={required} value={dados[name]??''} onChange={e=>set(name,e.target.value)} /></label>;

  return <div className="turmas-list-page"><header className="page-header"><div><h1>Cadastrar {aluno?'aluno':'professor'}</h1><p className="text-muted">Preencha os dados para criar o cadastro e o acesso ao sistema.</p></div></header>
    {erro && <div className="form-alert" role="alert">{erro}</div>}{sucesso && <div className="success-banner" role="status">{sucesso}<button className="secondary-button" onClick={()=>navigate(aluno?'/alunos':'/professores')}>Ir para a lista</button></div>}
    {!sucesso && <form className="form-card" onSubmit={enviar}><div className="form-grid">{campo('nome_completo','Nome completo')}{campo('email','E-mail','email')}{campo('senha','Senha','password')}{campo(aluno?'matricula':'matricula_funcional',aluno?'Matrícula':'Matrícula funcional')}{campo('cpf','CPF')}{aluno?campo('data_nascimento','Data de nascimento','date'):campo('titulacao','Titulação', 'text', false)}{aluno&&campo('telefone','Telefone','tel',false)}</div><div className="form-actions"><button type="submit" className="primary-button" disabled={enviando}>{enviando?'Salvando...':'Cadastrar'}</button></div></form>}
  </div>;
}
