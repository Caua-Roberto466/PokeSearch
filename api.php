<?php
// Este arquivo é a parte PHP do projeto.
// Ele recebe o nome do Pokémon, consulta a PokeAPI pelo servidor e devolve o resultado em JSON.
// O script.js chama este arquivo no lugar de chamar a PokeAPI diretamente.

// Informa ao navegador que a resposta é um JSON em UTF-8.
header("Content-Type: application/json; charset=utf-8");

// Função auxiliar que faz uma requisição HTTP GET e devolve o código e o corpo da resposta.
// Usa o cURL quando ele estiver instalado e, se não estiver, usa o file_get_contents.
function buscarUrl($url) {

    // Se a extensão cURL existe no servidor, usa ela.
    if (function_exists("curl_init")) {

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // devolve o corpo em vez de imprimir
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);          // desiste depois de 15 segundos
        curl_setopt($ch, CURLOPT_USERAGENT, "PokeSearch");
        $corpo = curl_exec($ch);
        $codigo = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return [$codigo, $corpo];
    }

    // Plano B: file_get_contents.
    // ignore_errors permite ler o corpo mesmo quando a API responde 404.
    $contexto = stream_context_create([
        "http" => [
            "timeout" => 15,
            "ignore_errors" => true,
            "header" => "User-Agent: PokeSearch\r\n"
        ]
    ]);
    $corpo = @file_get_contents($url, false, $contexto);

    // O PHP guarda os cabeçalhos da resposta em $http_response_header.
    // A primeira linha tem o formato "HTTP/1.1 200 OK", então pegamos o número dela.
    $codigo = 0;
    if (isset($http_response_header[0]) && preg_match("/\s(\d{3})\s/", $http_response_header[0], $partes)) {
        $codigo = (int) $partes[1];
    }

    return [$codigo, $corpo];
}

// Pega o nome enviado pela URL (api.php?nome=pikachu).
// Se não vier nada, usa um texto vazio.
$nome = isset($_GET["nome"]) ? strtolower(trim($_GET["nome"])) : "";

// Mantém só letras, números e hífen, para ninguém montar uma URL estranha.
$nome = preg_replace("/[^a-z0-9-]/", "", $nome);

// Se o nome ficou vazio, avisa o erro e encerra.
if ($nome === "") {
    http_response_code(400);
    echo json_encode(["erro" => "nome_vazio"]);
    exit;
}

// Primeira consulta: dados do Pokémon.
list($codigo, $corpo) = buscarUrl("https://pokeapi.co/api/v2/pokemon/" . $nome);

// 404 significa que a PokeAPI não conhece esse nome.
if ($codigo === 404) {
    http_response_code(404);
    echo json_encode(["erro" => "nao_encontrado"]);
    exit;
}

// Qualquer outra falha (sem internet, API fora do ar...) vira um erro genérico.
$pokemon = ($codigo === 200 && $corpo) ? json_decode($corpo, true) : null;
if (!$pokemon) {
    http_response_code(502);
    echo json_encode(["erro" => "falha_api"]);
    exit;
}

// Segunda consulta: dados da espécie (descrição, categoria, habitat, ovos).
// Se ela falhar, seguimos com null e a página mostra o restante normalmente.
$especie = null;
if (isset($pokemon["species"]["url"])) {
    list($codigoEspecie, $corpoEspecie) = buscarUrl($pokemon["species"]["url"]);
    if ($codigoEspecie === 200 && $corpoEspecie) {
        $especie = json_decode($corpoEspecie, true);
    }
}

// Devolve os dois JSONs juntos, no mesmo formato que o script.js já usava.
echo json_encode(["pokemon" => $pokemon, "especie" => $especie]);