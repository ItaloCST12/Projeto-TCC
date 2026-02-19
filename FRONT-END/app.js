const state = {
  token: null,
  formas: [],
  cepCache: {},
  ultimoCepConsultado: null,
};

const loginMsg = document.getElementById("loginMsg");
const pedidoMsg = document.getElementById("pedidoMsg");
const pedidoCard = document.getElementById("pedidoCard");
const enderecoCard = document.getElementById("enderecoCard");
const produtosLista = document.getElementById("produtosLista");
const pagamentosLista = document.getElementById("pagamentosLista");
const formaPagamentoSelect = document.getElementById("formaPagamento");
const enderecoMsg = document.getElementById("enderecoMsg");
const enderecosLista = document.getElementById("enderecosLista");
const ruaInput = document.getElementById("rua");
const cidadeInput = document.getElementById("cidade");
const cepInput = document.getElementById("cep");

const requestJson = async (
  url,
  options = {},
  fallbackError = "Erro na requisição",
) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error || data?.message || fallbackError;
    throw new Error(message);
  }

  return data;
};

const setMessage = (element, message, isError = false) => {
  element.textContent = message;
  element.className = isError ? "err" : "ok";
};

const normalizarCep = (value) => value.replace(/\D/g, "").slice(0, 8);

const formatarCep = (value) => {
  if (value.length <= 5) {
    return value;
  }
  return `${value.slice(0, 5)}-${value.slice(5)}`;
};

const preencherEnderecoPorCep = async (cep) => {
  if (state.cepCache[cep]) {
    const endereco = state.cepCache[cep];
    if (endereco.rua) {
      ruaInput.value = endereco.rua;
    }
    if (endereco.cidade) {
      cidadeInput.value = endereco.cidade;
    }
    setMessage(enderecoMsg, "Endereço preenchido pelo CEP.");
    return;
  }

  enderecoMsg.textContent = "Consultando CEP...";
  enderecoMsg.className = "muted";

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) {
      throw new Error("Erro ao consultar CEP");
    }

    const data = await response.json();
    if (data?.erro) {
      throw new Error("CEP não encontrado");
    }

    const endereco = {
      rua: data.logradouro?.trim() || "",
      cidade: data.localidade?.trim() || "",
    };

    state.cepCache[cep] = endereco;

    if (endereco.rua) {
      ruaInput.value = endereco.rua;
    }
    if (endereco.cidade) {
      cidadeInput.value = endereco.cidade;
    }

    setMessage(enderecoMsg, "Endereço preenchido pelo CEP.");
  } catch (error) {
    setMessage(
      enderecoMsg,
      error.message || "Não foi possível consultar o CEP.",
      true,
    );
  }
};

const carregarProdutos = async () => {
  produtosLista.innerHTML = "<li>Carregando...</li>";
  try {
    const data = await requestJson(
      "/produtos",
      {},
      "Erro ao carregar produtos",
    );
    if (!Array.isArray(data) || data.length === 0) {
      produtosLista.innerHTML = "<li>Nenhum produto cadastrado.</li>";
      return;
    }
    produtosLista.innerHTML = data
      .map(
        (produto) =>
          `<li>#${produto.id} - ${produto.nome} (${produto.disponivel ? "Disponível" : "Indisponível"})</li>`,
      )
      .join("");
  } catch (error) {
    produtosLista.innerHTML = "<li>Erro ao carregar produtos.</li>";
  }
};

const carregarFormasPagamento = async () => {
  pagamentosLista.innerHTML = "<li>Carregando...</li>";
  try {
    const data = await requestJson(
      "/pagamentos/formas",
      {},
      "Erro ao carregar formas de pagamento",
    );
    state.formas = data.formas || [];

    if (state.formas.length === 0) {
      pagamentosLista.innerHTML = "<li>Nenhuma forma encontrada.</li>";
      formaPagamentoSelect.innerHTML = "";
      return;
    }

    pagamentosLista.innerHTML = state.formas
      .map((forma) => `<li>${forma}</li>`)
      .join("");
    formaPagamentoSelect.innerHTML = state.formas
      .map((forma) => `<option value="${forma}">${forma}</option>`)
      .join("");
  } catch (error) {
    pagamentosLista.innerHTML =
      "<li>Erro ao carregar formas de pagamento.</li>";
  }
};

const login = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    setMessage(loginMsg, "Informe email e senha.", true);
    return;
  }

  try {
    const data = await requestJson(
      "/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
      "Falha no login",
    );

    state.token = data.token;
    setMessage(loginMsg, "Login realizado com sucesso.");
    pedidoCard.classList.remove("hidden");
    enderecoCard.classList.remove("hidden");
    carregarMeusEnderecos();
  } catch (error) {
    setMessage(loginMsg, error.message || "Erro no login", true);
  }
};

const carregarMeusEnderecos = async () => {
  if (!state.token) {
    return;
  }

  enderecosLista.innerHTML = "<li>Carregando...</li>";

  try {
    const enderecos = await requestJson(
      "/enderecos/me",
      {
        headers: { Authorization: `Bearer ${state.token}` },
      },
      "Erro ao carregar endereços",
    );

    if (!Array.isArray(enderecos) || enderecos.length === 0) {
      enderecosLista.innerHTML = "<li>Nenhum endereço cadastrado.</li>";
      return;
    }

    enderecosLista.innerHTML = enderecos
      .map(
        (endereco) =>
          `<li>${endereco.rua}${endereco.numero ? `, ${endereco.numero}` : ""} - ${endereco.cidade} (${endereco.cep})</li>`,
      )
      .join("");
  } catch (error) {
    enderecosLista.innerHTML = "<li>Erro ao carregar endereços.</li>";
  }
};

const criarEndereco = async () => {
  if (!state.token) {
    setMessage(enderecoMsg, "Faça login antes de cadastrar endereço.", true);
    return;
  }

  const rua = document.getElementById("rua").value.trim();
  const numero = document.getElementById("numero").value.trim();
  const cidade = document.getElementById("cidade").value.trim();
  const cep = document.getElementById("cep").value.trim();

  if (!rua || !cidade || !cep) {
    setMessage(enderecoMsg, "Preencha rua, cidade e CEP.", true);
    return;
  }

  try {
    await requestJson(
      "/enderecos",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({
          rua,
          numero,
          cidade,
          cep,
        }),
      },
      "Não foi possível cadastrar o endereço",
    );

    setMessage(enderecoMsg, "Endereço cadastrado com sucesso.");
    document.getElementById("rua").value = "";
    document.getElementById("numero").value = "";
    document.getElementById("cidade").value = "";
    document.getElementById("cep").value = "";
    carregarMeusEnderecos();
  } catch (error) {
    setMessage(
      enderecoMsg,
      error.message || "Erro ao cadastrar endereço",
      true,
    );
  }
};

const criarPedido = async () => {
  if (!state.token) {
    setMessage(pedidoMsg, "Faça login antes de solicitar encomenda.", true);
    return;
  }

  const produtoId = Number(document.getElementById("produtoId").value);
  const quantidade = Number(document.getElementById("quantidade").value);
  const unidade = document.getElementById("unidade").value;
  const tipoEntrega = document.getElementById("tipoEntrega").value;
  const formaPagamento = document.getElementById("formaPagamento").value;

  if (!produtoId || quantidade <= 0 || !unidade.trim() || !tipoEntrega.trim()) {
    setMessage(pedidoMsg, "Preencha os campos do pedido corretamente.", true);
    return;
  }

  try {
    const data = await requestJson(
      "/pedidos",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({
          produtoId,
          quantidade,
          unidade,
          tipoEntrega,
          formaPagamento,
        }),
      },
      "Não foi possível criar a encomenda",
    );

    setMessage(pedidoMsg, `Encomenda criada com sucesso. Pedido #${data.id}`);
  } catch (error) {
    setMessage(pedidoMsg, error.message || "Erro ao criar encomenda", true);
  }
};

document.getElementById("btnLogin").addEventListener("click", login);
document
  .getElementById("btnProdutos")
  .addEventListener("click", carregarProdutos);
document
  .getElementById("btnPagamentos")
  .addEventListener("click", carregarFormasPagamento);
document.getElementById("btnPedido").addEventListener("click", criarPedido);
document.getElementById("btnEndereco").addEventListener("click", criarEndereco);
document
  .getElementById("btnEnderecos")
  .addEventListener("click", carregarMeusEnderecos);

cepInput.addEventListener("input", async (event) => {
  const cepNormalizado = normalizarCep(event.target.value);
  event.target.value = formatarCep(cepNormalizado);

  if (cepNormalizado.length !== 8) {
    state.ultimoCepConsultado = null;
    return;
  }

  if (state.ultimoCepConsultado === cepNormalizado) {
    return;
  }

  state.ultimoCepConsultado = cepNormalizado;
  await preencherEnderecoPorCep(cepNormalizado);
});

carregarProdutos();
carregarFormasPagamento();
