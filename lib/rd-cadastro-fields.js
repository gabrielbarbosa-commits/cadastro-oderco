const RAMOS = [
  "Alimentos", "Antenas", "Armarinhos", "Assistência técnica", "Auto peças",
  "Automação", "Automotivo", "Cabos (especializado)", "Cine e foto",
  "Concessionária automotiva", "Conveniência de posto", "E-commerce", "Eletrônica",
  "Farmácia", "Ferramentas", "Games", "Home center (som e imagem)", "Informática",
  "Integrador solar", "Lan house", "Licitação", "Livraria", "Materiais elétricos",
  "Material para construção", "Mercearia", "Móveis e eletro", "Musical", "Papelaria",
  "Provedor", "Revenda corporativa (servidores)", "Revendedor solar", "Segurança",
  "Som profissional (iluminação e sonorização)", "Supermercado", "Telecom",
  "Utilidades domésticas",
];

const CAMPOS_CADASTRO_LP = [
  {
    api_identifier: "cf_cadastro_lp_principal_atividade",
    name: "[CADASTRO-LP] Principal atividade",
    options: ["Atacado", "Varejo", "Indústria", "Solar"],
  },
  {
    api_identifier: "cf_cadastro_lp_ramo_atividade",
    name: "[CADASTRO-LP] Ramo de atividade",
    options: RAMOS,
  },
  {
    api_identifier: "cf_cadastro_lp_area_interesse",
    name: "[CADASTRO-LP] Área de interesse",
    options: [
      "Dropshipping", "Uso e consumo (corporativo)", "Revenda",
      "Licitação", "Prestação de serviço", "Provedor",
    ],
  },
  {
    api_identifier: "cf_cadastro_lp_preferencia_atendimento",
    name: "[CADASTRO-LP] Preferência de atendimento",
    options: ["Mensagem no WhatsApp", "Ligação"],
  },
];

/* Campos de texto livre. São dados que a consulta de CNPJ já devolve e que a LP
   mostrava na tela sem mandar para o RD. Ficam em campos próprios, e não
   concatenados, para o time não precisar tratar a string antes de usar.

   Texto livre, e não COMBO_BOX, inclusive na situação cadastral: as duas fontes
   de consulta escrevem a situação com palavras próprias, e uma opção fora da
   lista faria o RD recusar a conversão inteira — o cadastro do lead se perderia
   por causa de um campo acessório. */
const CAMPOS_TEXTO_CADASTRO_LP = [
  { api_identifier: "cf_cep", name: "CEP" },
  { api_identifier: "cf_logradouro", name: "Logradouro" },
  { api_identifier: "cf_numero", name: "Número" },
  { api_identifier: "cf_inscricao_estadual", name: "Inscrição estadual" },
  { api_identifier: "cf_cnae_codigo", name: "CNAE (código)" },
  { api_identifier: "cf_cnae_descricao", name: "CNAE (descrição)" },
  { api_identifier: "cf_situacao_cadastral", name: "Situação cadastral" },
  { api_identifier: "cf_nome_fantasia", name: "Nome fantasia" },
  { api_identifier: "cf_data_fundacao", name: "Data de fundação" },
  { api_identifier: "cf_data_situacao_cadastral", name: "Data da situação cadastral" },
  { api_identifier: "cf_porte", name: "Porte" },
  { api_identifier: "cf_natureza_juridica", name: "Natureza jurídica" },
  { api_identifier: "cf_simples_nacional", name: "Optante pelo Simples Nacional" },
  { api_identifier: "cf_mei", name: "MEI" },
  { api_identifier: "cf_capital_social", name: "Capital social" },
];

/* As datas vão como texto em ISO 8601 (1966-10-24), e não como campo de data do
   RD: ordenam certo alfabeticamente e não dependem de o RD aceitar o formato.
   Um campo de data que recusa o valor derrubaria a conversão inteira, e o lead
   se perderia por causa de um dado acessório. */

const CAMPOS_A_CRIAR = [...CAMPOS_CADASTRO_LP, ...CAMPOS_TEXTO_CADASTRO_LP];

function fieldPayload(field) {
  const localizedName = { "pt-BR": field.name };
  const payload = {
    api_identifier: field.api_identifier,
    data_type: "STRING",
    presentation_type: field.options ? "COMBO_BOX" : "TEXT_INPUT",
    name: localizedName,
    label: localizedName,
  };

  if (field.options) {
    payload.validation_rules = {
      valid_options: field.options.map((option) => ({
        value: option,
        label: { "pt-BR": option },
      })),
    };
  }

  return payload;
}

module.exports = { CAMPOS_CADASTRO_LP, CAMPOS_TEXTO_CADASTRO_LP, CAMPOS_A_CRIAR, fieldPayload };
