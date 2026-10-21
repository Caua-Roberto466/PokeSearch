// Objeto que traduz o nome dos tipos (retornados em inglês pela API) para português.
// A chave é o nome da API e o valor é o texto que será exibido na tela.
const tiposPt = {
    normal: "Normal", fire: "Fogo", water: "Água", electric: "Elétrico",
    grass: "Planta", ice: "Gelo", fighting: "Lutador", poison: "Veneno",
    ground: "Terra", flying: "Voador", psychic: "Psíquico", bug: "Inseto",
    rock: "Pedra", ghost: "Fantasma", dragon: "Dragão", dark: "Sombrio",
    steel: "Aço", fairy: "Fada"
};

// Objeto que traduz o nome dos atributos (stats) para português.
const statsPt = {
    "hp": "HP",
    "attack": "Ataque",
    "defense": "Defesa",
    "special-attack": "Ataque Esp.",
    "special-defense": "Defesa Esp.",
    "speed": "Velocidade"
};

// Função auxiliar que transforma o nome da API em um nome bonito.
// Exemplo: "mr-mime" vira "Mr Mime".
function formatarNome(nome) {

    // split separa o texto em partes sempre que encontra um hífen.
    // map percorre cada parte e coloca a primeira letra em maiúscula.
    // join junta tudo de novo, separando as partes por espaço.
    return nome
        .split("-")
        .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
        .join(" ");
}

// Função auxiliar que mostra uma mensagem na tela e esconde o resultado anterior.
function mostrarMensagem(texto) {

    // Troca o texto da área de mensagens.
    document.getElementById("textoMensagem").textContent = texto;

    // Mostra a área de mensagens (remove o atributo hidden).
    document.getElementById("mensagem").hidden = false;

    // Esconde o cartão do Pokémon (adiciona o atributo hidden).
    document.getElementById("resultado").hidden = true;
}

// Função que consulta o arquivo api.php (PHP), que busca os dados na PokeAPI.
// Devolve { encontrado, dados, especie }. Se algo der errado, lança um erro.
async function buscarPeloPhp(busca) {

    // Chama o PHP passando o nome pela URL (api.php?nome=pikachu).
    const resposta = await fetch("api.php?nome=" + encodeURIComponent(busca));

    // Lê o JSON da resposta.
    // Se o servidor não tiver PHP, a resposta não é JSON e esta linha lança um erro.
    const json = await resposta.json();

    // O PHP avisou que a PokeAPI não conhece esse nome.
    if (json.erro === "nao_encontrado") {
        return { encontrado: false };
    }

    // Qualquer outro problema vira erro, para o código usar o plano B.
    if (json.erro || !json.pokemon) {
        throw new Error("Falha no PHP: " + (json.erro || "resposta inesperada"));
    }

    return { encontrado: true, dados: json.pokemon, especie: json.especie };
}

// Função que consulta a PokeAPI diretamente do navegador (plano B, sem PHP).
// Devolve o mesmo formato da função buscarPeloPhp.
async function buscarDireto(busca) {

    // Primeira requisição: dados do Pokémon.
    const resposta = await fetch(
        "https://pokeapi.co/api/v2/pokemon/" + encodeURIComponent(busca)
    );

    // Quando o Pokémon não existe, a API retorna o código 404.
    if (resposta.status === 404) {
        return { encontrado: false };
    }

    // Outros erros (API fora do ar, por exemplo) caem no catch da consultarPokemon.
    if (!resposta.ok) {
        throw new Error("Erro na PokeAPI: " + resposta.status);
    }

    const dados = await resposta.json();

    // Segunda requisição: dados da espécie.
    // Se der errado, usa null e a página mostra o restante normalmente.
    const respostaEspecie = await fetch(dados.species.url);
    const especie = respostaEspecie.ok ? await respostaEspecie.json() : null;

    return { encontrado: true, dados: dados, especie: especie };
}

// Declara uma função assíncrona chamada consultarPokemon.
// O uso de "async" permite utilizar "await" para aguardar respostas de APIs.
async function consultarPokemon() {

    // Captura o valor digitado pelo usuário no campo que possui o id "pokemon".
    // trim() remove espaços no começo e no fim.
    // toLowerCase() deixa tudo em minúsculo, pois a API só aceita nomes assim.
    // replace(/ /g, "-") troca espaços por hífen (ex.: "mr mime" vira "mr-mime").
    // replace(/[.']/g, "") remove pontos e apóstrofos (ex.: "mr. mime" vira "mr-mime").
    const busca = document
        .getElementById("pokemon")
        .value
        .trim()
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[.']/g, "");

    // Verifica se o usuário não digitou nenhum Pokémon.
    if (busca === "") {

        // Exibe uma mensagem de aviso na tela.
        mostrarMensagem("Digite o nome de um Pokémon!");

        // Interrompe a execução da função.
        return;
    }

    // Inicia um bloco de tratamento de erros.
    // Tudo que estiver dentro do "try" será executado normalmente.
    // Caso ocorra algum erro, o código irá para o bloco "catch".
    try {

        // Variável que vai guardar o resultado da busca.
        let resultado;

        try {

            // Primeiro tenta pelo PHP (api.php), que consulta a PokeAPI pelo servidor.
            resultado = await buscarPeloPhp(busca);

        } catch (erroPhp) {

            // Se o PHP não estiver disponível (ex.: abrindo o index.html direto no navegador),
            // o site continua funcionando e consulta a PokeAPI diretamente.
            console.log("PHP indisponível, consultando a PokeAPI direto:", erroPhp);
            resultado = await buscarDireto(busca);
        }

        // Se o Pokémon não existe, mostra o aviso e interrompe a função.
        if (!resultado.encontrado) {
            mostrarMensagem("Pokémon não encontrado! Confira se o nome está escrito em inglês.");
            return;
        }

        // Separa os dois JSONs recebidos (Pokémon e espécie).
        const dados = resultado.dados;
        const especie = resultado.especie;

        // Chama a função que preenche a tela com os dados recebidos.
        exibirPokemon(dados, especie);

    } catch (erro) {

        // Exibe informações detalhadas sobre o erro no console do navegador.
        // Muito útil para depuração e manutenção do sistema.
        console.log(erro);

        // Mostra uma mensagem genérica para o usuário.
        mostrarMensagem("Erro ao consultar a API.");

    }
}

// Função que recebe os JSONs da API e atualiza o conteúdo da página.
function exibirPokemon(dados, especie) {

    // Pega o nome do tipo principal (primeiro da lista).
    // Ele será usado para pintar o cartão com a cor do tipo.
    const tipoPrincipal = dados.types[0].type.name;

    // Define as classes do cartão: "cartao" e "t-" + tipo (ex.: "t-fire").
    // O CSS usa a classe do tipo para trocar a cor do cartão.
    document.getElementById("resultado").className = "cartao t-" + tipoPrincipal;

    // Número do Pokémon com zeros à esquerda (ex.: 25 vira #0025).
    document.getElementById("numero").textContent =
        "#" + String(dados.id).padStart(4, "0");

    // Nome do Pokémon já formatado.
    document.getElementById("nomePokemon").textContent = formatarNome(dados.name);

    // Imagem oficial. Se não existir, usa o sprite comum como alternativa.
    // O operador ?. evita erro caso alguma parte do JSON não exista.
    const imagem = dados.sprites.other?.["official-artwork"]?.front_default
        || dados.sprites.front_default
        || "";
    document.getElementById("arte").src = imagem;
    document.getElementById("arte").alt = "Arte oficial de " + formatarNome(dados.name);

    // Altura e peso chegam em decímetros e hectogramas.
    // Dividindo por 10 convertemos para metros e quilogramas.
    // toFixed(1) mantém uma casa decimal e replace troca o ponto pela vírgula.
    document.getElementById("altura").textContent =
        (dados.height / 10).toFixed(1).replace(".", ",") + " m";
    document.getElementById("peso").textContent =
        (dados.weight / 10).toFixed(1).replace(".", ",") + " kg";

    // Experiência base (pode vir vazia em alguns Pokémon).
    document.getElementById("xp").textContent = dados.base_experience ?? "—";

    // ----- Tipos -----
    // Cria um <span> colorido para cada tipo do Pokémon.
    // map percorre a lista de tipos e join junta os pedaços de HTML em um texto só.
    document.getElementById("tipos").innerHTML = dados.types
        .map(t => {
            const nomeTipo = t.type.name;
            return `<span class="tipo t-${nomeTipo}">${tiposPt[nomeTipo] || formatarNome(nomeTipo)}</span>`;
        })
        .join("");

    // ----- Dados da espécie (segunda requisição) -----
    // Valores padrão, usados caso a segunda requisição não tenha dado certo.
    let descricao = "";
    let categoria = "";
    let habitat = "—";
    let ovos = "—";

    // Só procura esses dados se a variável "especie" existir.
    if (especie) {

        // find percorre a lista e devolve o primeiro item em inglês.
        const textoDescricao = especie.flavor_text_entries.find(
            item => item.language.name === "en"
        );

        // Se encontrou, troca quebras de linha e caracteres estranhos por espaço.
        if (textoDescricao) {
            descricao = textoDescricao.flavor_text.replace(/\s+/g, " ");
        }

        // Procura a categoria em inglês (ex.: "Mouse Pokémon").
        const textoCategoria = especie.genera.find(
            item => item.language.name === "en"
        );
        if (textoCategoria) {
            categoria = textoCategoria.genus;
        }

        // Nem todo Pokémon tem habitat cadastrado.
        if (especie.habitat) {
            habitat = formatarNome(especie.habitat.name);
        }

        // Junta os nomes dos grupos de ovos separados por vírgula.
        if (especie.egg_groups.length > 0) {
            ovos = especie.egg_groups.map(g => formatarNome(g.name)).join(", ");
        }
    }

    // Escreve os dados da espécie na tela.
    document.getElementById("descricao").textContent = descricao;
    document.getElementById("categoria").textContent = categoria;
    document.getElementById("habitat").textContent = habitat;
    document.getElementById("ovos").textContent = ovos;

    // ----- Habilidades -----
    // Cada habilidade vira um item de lista.
    // A habilidade oculta recebe a classe "oculta" e o aviso "oculta".
    document.getElementById("habilidades").innerHTML = dados.abilities
        .map(h => {
            const classe = h.is_hidden ? "oculta" : "";
            const aviso = h.is_hidden ? " <small>oculta</small>" : "";
            return `<li class="${classe}">${formatarNome(h.ability.name)}${aviso}</li>`;
        })
        .join("");

    // ----- Atributos base (barras) -----
    // reduce soma todos os valores para calcular o total.
    const total = dados.stats.reduce((soma, s) => soma + s.base_stat, 0);
    document.getElementById("totalStats").textContent = "total " + total;

    // Cada atributo vira uma linha com nome, valor e uma barra.
    // A largura da barra é o valor dividido por 200 (limitado a 100%).
    document.getElementById("stats").innerHTML = dados.stats
        .map(s => {
            const nome = statsPt[s.stat.name] || formatarNome(s.stat.name);
            const largura = Math.min(100, Math.round((s.base_stat / 200) * 100));
            return `
                <li>
                    <span class="stat-nome">${nome}</span>
                    <span class="stat-valor">${s.base_stat}</span>
                    <span class="barra"><span style="width: ${largura}%"></span></span>
                </li>`;
        })
        .join("");

    // ----- Sprites -----
    // Lista com o rótulo e o endereço de cada imagem.
    const listaSprites = [
        { rotulo: "Frente", url: dados.sprites.front_default },
        { rotulo: "Costas", url: dados.sprites.back_default },
        { rotulo: "Shiny", url: dados.sprites.front_shiny },
        { rotulo: "Shiny costas", url: dados.sprites.back_shiny }
    ];

    // filter remove as imagens que não existem (url nula) e map cria o HTML de cada uma.
    document.getElementById("sprites").innerHTML = listaSprites
        .filter(s => s.url)
        .map(s => `<li><img src="${s.url}" alt="${s.rotulo}"><span>${s.rotulo}</span></li>`)
        .join("");

    // ----- Golpes -----
    // slice(0, 12) pega apenas os 12 primeiros golpes da lista, pois alguns Pokémon têm mais de 100.
    document.getElementById("golpes").innerHTML = dados.moves
        .slice(0, 12)
        .map(m => `<li>${formatarNome(m.move.name)}</li>`)
        .join("");

    // Mostra o total de golpes em dois lugares.
    document.getElementById("totalGolpes").textContent = dados.moves.length;
    document.getElementById("infoGolpes").textContent =
        "12 de " + dados.moves.length;

    // Esconde a área de mensagens e mostra o cartão com o resultado.
    document.getElementById("mensagem").hidden = true;
    document.getElementById("resultado").hidden = false;
}