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

function fieldPayload(field) {
  const localizedName = { "pt-BR": field.name };
  return {
    api_identifier: field.api_identifier,
    data_type: "STRING",
    presentation_type: "COMBO_BOX",
    name: localizedName,
    label: localizedName,
    validation_rules: {
      valid_options: field.options.map((option) => ({
        value: option,
        label: { "pt-BR": option },
      })),
    },
  };
}

module.exports = { CAMPOS_CADASTRO_LP, fieldPayload };
