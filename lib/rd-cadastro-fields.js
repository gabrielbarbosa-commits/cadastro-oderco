const RAMOS = [
  "Informática", "Musical", "Automotivo", "Segurança", "Antenas", "Telecom",
  "Utilidades domésticas", "Materiais elétricos", "Ferramentas", "Móveis e eletro",
  "Papelaria", "Eletrônica", "Assistência técnica", "Livraria", "Brinquedos",
  "Games", "Home center (som e imagem)", "Supermercado", "Mercearia", "Provedor",
  "Material para construção", "Armarinhos", "Lan house", "Farmácia",
  "Conveniência de posto", "Alimentos", "Concessionária automotiva", "Auto peças",
  "E-commerce", "Revenda corporativa (servidores)", "Automação",
  "Som profissional (iluminação e sonorização)", "Cine e foto",
  "Cabos (especializado)", "Licitação", "Integrador solar", "Revendedor solar",
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
