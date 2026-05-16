# CuidarLink - roteiro de QA de producao

Use este roteiro antes de enviar o link para novos usuarios testarem.

## Antes de comecar

- Rodar `npm run smoke:prod`.
- Confirmar que `/api/health` retorna banco, Google OAuth, documentos e e-mails como `true`.
- Usar uma conta de paciente, uma conta de profissional e uma conta admin.
- Testar pelo menos uma vez em tela pequena e uma vez em notebook.

## Fluxo do paciente

1. Entrar como paciente.
2. Abrir a busca publica.
3. Usar filtros de servico, genero, porte fisico, idade, disponibilidade, viagem e raio.
4. Favoritar um profissional.
5. Abrir detalhes do profissional.
6. Enviar uma mensagem antes do pedido.
7. Criar um pedido com nome, e-mail, telefone, data, horario, duracao, CEP, numero e aceite das regras.
8. Confirmar que o pedido aparece no painel do paciente.

Resultado esperado:

- O mapa carrega.
- Profissionais aparecem por compatibilidade.
- Favorito aparece no painel.
- Mensagem aparece em `/dashboard/mensagens`.
- Pedido aparece como enviado.
- O paciente recebe notificacao quando o profissional responder.

## Fluxo do profissional

1. Entrar como profissional.
2. Conferir foto, servicos, agenda, valores sob consulta, viagem e WhatsApp publico quando configurado.
3. Abrir mensagens recebidas antes do pedido.
4. Responder a conversa.
5. Abrir pedidos recebidos.
6. Aceitar, agendar, cancelar e concluir apenas quando permitido.
7. Conferir se o horario ocupado deixa de aparecer para novo pedido.

Resultado esperado:

- Agenda salva e interfere na busca.
- Mensagens notificam o paciente.
- Status do pedido muda no painel dos dois lados.
- Conclusao so fica coerente depois do horario permitido.

## Fluxo de documentos

1. Enviar CPF, RG ou CNH, comprovante de residencia e registro profissional quando aplicavel.
2. Entrar como admin.
3. Filtrar documentos pendentes.
4. Abrir arquivo privado.
5. Aprovar ou recusar documento.
6. Aprovar cadastro geral do profissional quando os obrigatorios estiverem corretos.

Resultado esperado:

- Documento fica privado.
- Auditoria registra a acao.
- Selo verificado aparece na busca apenas depois da aprovacao.

## Fluxo admin

1. Abrir `/admin`.
2. Conferir checklist de producao.
3. Ver pontos operacionais.
4. Revisar profissionais sem selo, sem agenda ou sem foto.
5. Testar e-mail administrativo.
6. Alterar assinatura de uma conta de teste para `Cancelado` ou `Vencido`.

Resultado esperado:

- Painel mostra contadores coerentes.
- Alertas operacionais apontam pendencias reais.
- Paciente cancelado/vencido nao consegue criar pedido, favorito ou mensagem nova.
- Profissional e admin continuam operando.

## Fluxo de historico

1. Concluir atendimento.
2. Avaliar profissional como paciente.
3. Confirmar que a nota aparece na busca.
4. Arquivar atendimento.
5. Filtrar ultimos 30 dias, 3 meses e periodo personalizado.

Resultado esperado:

- Historico nao fica poluido por itens antigos.
- Avaliacao aparece no perfil publico.
- Itens arquivados continuam consultaveis.

## Erros que bloqueiam lancamento

- Cadastro ou login falhando.
- Banco indisponivel.
- Upload ou download privado de documentos falhando.
- Pedido enviado sem aparecer no painel do profissional.
- Status de pedido diferente entre paciente e profissional.
- Paciente com assinatura vencida conseguindo criar novo pedido.
- E-mail de notificacao indisponivel.
- `demoFallback` ativo em producao.

## Comando rapido

```bash
npm run smoke:prod
```
