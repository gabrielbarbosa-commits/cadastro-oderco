# Cadastro de Revenda — Oderço

Landing page oficial de captação de novos revendedores da Oderço. Ela valida o CNPJ, coleta os dados comerciais e registra a conversão no **RD Station Marketing**.

**Produção:** https://oderco-lp-revenda.vercel.app

## Rotas públicas

| Rota | Uso |
| --- | --- |
| `/` | Versão oficial (V2), com vídeo no hero. |
| `/v1/` | Variante com imagem estática no hero. |
| `/v2/` | Redireciona permanentemente para `/`. |
| `/v3/` | Removida. Redireciona permanentemente para `/`. |

Apenas duas versões são mantidas: a oficial (`/`, hero em vídeo) e a `/v1/` (hero em imagem estática). Toda alteração de conteúdo deve ser aplicada nas duas.

O arquivo [`vercel.json`](vercel.json) mantém esse apontamento: a raiz reescreve para `v2/index.html`, sem alterar a URL visível do visitante.

## Como a LP funciona

1. A pessoa informa CNPJ, contato e área de interesse.
2. O navegador consulta o CNPJ para sugerir dados da empresa:
   - **CNPJ.ws** é a fonte principal e fornece também dados como inscrição estadual quando disponível;
   - **BrasilAPI** é o fallback.
3. Ao concluir o formulário, o navegador envia somente os dados preenchidos para `POST /api/rd/conversion`.
4. A Function da Vercel valida o envio e registra uma conversão na API do RD Station Marketing.
5. No RD, o contato recebe o evento/tag `cadastro-lp-revenda` e pode entrar nas segmentações e automações comerciais.

## Integração com o RD Station

Não há embed de formulário do RD. O formulário é próprio da LP, para manter a experiência e a consulta de CNPJ; o registro no RD é feito no backend.

```text
Visitante
  → formulário da LP
  → POST /api/rd/conversion
  → API de Conversões do RD Station
  → evento, campos do contato, tags e automações do RD
```

### De/para dos campos

| Formulário / empresa | RD Station |
| --- | --- |
| Nome | `name` |
| E-mail | `email` |
| WhatsApp | `mobile_phone` |
| CNPJ | `cf_cnpj` |
| Razão social | `company_name` e `cf_razao_social` |
| Nome fantasia | `cf_nome_fantasia` |
| Logradouro | `cf_logradouro` |
| Número | `cf_numero` |
| Complemento | `cf_complemento` |
| CEP | `cf_cep` |
| Bairro | `cf_bairro` |
| Cidade, UF | `city`, `state` |
| Inscrição estadual | `cf_inscricao_estadual` |
| Situação cadastral | `cf_situacao_cadastral` |
| Data da situação cadastral | `cf_data_situacao_cadastral` |
| Data de fundação | `cf_data_fundacao` |
| Porte | `cf_porte` |
| Natureza jurídica | `cf_natureza_juridica` |
| Matriz ou filial | `cf_matriz_ou_filial` |
| Optante pelo Simples | `cf_simples_nacional` |
| MEI | `cf_mei` |
| Capital social | `cf_capital_social` |
| CNAE | `cf_cnae_codigo` e `cf_cnae_descricao` |
| Principal atividade | `cf_cadastro_lp_principal_atividade` |
| Ramo de atividade | `cf_cadastro_lp_ramo_atividade` |
| Área de interesse | `cf_cadastro_lp_area_interesse` |
| Preferência de atendimento | `cf_cadastro_lp_preferencia_atendimento` |

Cada dado vai em um campo próprio, nunca concatenado: quem consome no RD não precisa separar string para usar uma parte. Por isso o endereço vai em pedaços e o CNAE vai em código e descrição separados.

**Campos que pararam de receber dado:** `cf_endereco` guardava o endereço concatenado e `cf_cnae` guardava `"código · descrição"`. Os dois seguem na conta com o histórico dos leads gravados até setembro de 2026, mas não recebem mais nada. `company_address` nunca existiu na conta — era destino morto.

Os quatro campos `[CADASTRO-LP]` são de escolha única e exclusivos da LP. As opções válidas ficam centralizadas em [`lib/rd-cadastro-fields.js`](lib/rd-cadastro-fields.js), que também impede que valores fora da lista sejam enviados pela API. Os campos de texto (`cf_cep`, `cf_logradouro`, `cf_numero`, `cf_inscricao_estadual`, `cf_cnae_codigo`, `cf_cnae_descricao`, `cf_situacao_cadastral`, `cf_nome_fantasia`) ficam no mesmo arquivo e foram criados pelo fluxo controlado de `/api/rd/connect?action=create_fields`.

A situação cadastral é texto livre de propósito: as duas fontes de consulta escrevem a situação com palavras próprias, e um valor fora de uma lista fechada faria o RD recusar a conversão inteira — perderíamos o lead por causa de um campo acessório.

`cf_complemento` já existia na conta e é reaproveitado. Leads de outros formulários também gravam nele; para isolar os da LP, filtre pela tag `cadastro-lp-revenda`.

A inscrição estadual só vem da consulta `publica.cnpj.ws`. Quando ela falha e a LP cai no plano B (`brasilapi`), a IE vem vazia e o campo é omitido do envio.

### Conversão no RD

A conversão é enviada com:

- `conversion_identifier`: `cadastro-lp-revenda`
- tag: `cadastro-lp-revenda`
- evento: `CONVERSION`
- família: `CDP`

No RD Station, as segmentações e automações devem usar o evento `cadastro-lp-revenda` junto com os campos `[CADASTRO-LP]`. A distribuição em rodízio de responsáveis configurada no RD é uma automação da plataforma; ela não fica hardcoded na LP.

## Variáveis de ambiente

As credenciais ficam apenas nas variáveis de ambiente da Vercel e no `.env` local. **Nunca** devem ir para HTML, JavaScript do navegador, commits ou prints.

| Variável | Finalidade |
| --- | --- |
| `RD_API_KEY` | Obrigatória para registrar conversões no RD. Usada somente por `api/rd/conversion.js`. |
| `RD_CLIENT_ID` | OAuth administrativo para auditoria/criação controlada de campos. |
| `RD_CLIENT_SECRET` | OAuth administrativo e assinatura de consultas autenticadas de campos. |
| `RD_REFRESH_TOKEN` | Necessária apenas para a consulta administrativa permanente em `/api/rd/fields`. |
| `RD_TOKEN_CAPTURE_PUBLIC_KEY` | Opcional; cifra o refresh token retornado pelo fluxo OAuth para captura segura. |

O front-end não recebe `RD_API_KEY`, `RD_CLIENT_SECRET` nem tokens OAuth. A única chamada da página é para a própria Function `/api/rd/conversion`.

## Segurança e validação

`api/rd/conversion.js` implementa:

- aceitação exclusiva de `POST`;
- allowlist de origens autorizadas;
- limite de tamanho do corpo da requisição;
- rate limit por IP (5 tentativas a cada 10 minutos);
- campo honeypot para bots;
- validação de dígitos do CNPJ, e-mail, telefone e opções dos campos;
- timeout na chamada ao RD;
- `Cache-Control: no-store` nas respostas da API.

As rotas administrativas de OAuth e auditoria (`/api/rd/connect`, `/api/rd/callback` e `/api/rd/fields`) não fazem parte do fluxo normal de cadastro. Use-as somente para manutenção autorizada do RD.

## Estrutura do repositório

```text
v1/index.html                Variante com hero de imagem
v2/index.html                LP oficial com hero de vídeo
api/rd/conversion.js         Endpoint server-side que envia conversões ao RD
api/rd/connect.js            Início do OAuth administrativo
api/rd/callback.js           Callback OAuth e criação controlada de campos
api/rd/fields.js             Consulta autenticada de campos do RD
lib/rd-cadastro-fields.js    Definição central dos campos [CADASTRO-LP]
assets/                      Vídeos, logos, imagens e prints da LP
vercel.json                  Roteamento da V2 como versão oficial
```

## Desenvolvimento e deploy

Não há processo de build do front-end: as páginas são HTML, CSS e JavaScript estáticos, e as integrações ficam nas Vercel Functions em `api/`.

Para desenvolver localmente com as Functions e variáveis configuradas:

```bash
npx vercel dev
```

Para publicar a produção, o projeto deve estar vinculado à Vercel e usar as variáveis de ambiente de produção já cadastradas:

```bash
npx vercel --prod
```

Depois do deploy, valide ao menos:

- `/` abre a V2;
- `/v1/` abre a variante estática;
- um cadastro de teste aparece no RD com o evento `cadastro-lp-revenda`;
- os campos `[CADASTRO-LP]` chegam preenchidos;
- a automação do RD encaminha o lead conforme a segmentação aplicável.

## Observações operacionais

- A página somente capta e qualifica o lead; o cadastro de usuário/conta no e-commerce não é criado por ela.
- Os vídeos pesados ficam fora do Git; consulte [`assets/video/README.md`](assets/video/README.md) antes de substituí-los.
- Os prints do aplicativo foram tratados para não expor valores comerciais legíveis.
- Antes de alterar um campo existente no RD, valide impacto em segmentações e automações. Os campos da LP foram criados separados justamente para não afetar a base legada.
