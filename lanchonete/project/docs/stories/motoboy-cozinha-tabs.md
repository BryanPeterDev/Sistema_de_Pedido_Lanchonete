# Motoboy: abas Entregas e Cozinha

## Objetivo

Permitir que o usuario com perfil motoboy acesse duas telas operacionais pelo aside:

- `/motoboy`, para acompanhar e concluir entregas;
- `/cozinha`, para acompanhar a fila da cozinha.

## Comportamento esperado

- O aside deve funcionar como troca de abas entre `Entregas` e `Cozinha`.
- A aba ativa deve acompanhar a rota atual.
- O botao `Sair` deve ficar no aside.
- As telas nao devem exibir headers duplicados de usuario/logout.

## Criterios de aceite

- Ao entrar em `/motoboy`, o motoboy ve o aside e a aba `Entregas` ativa.
- Ao clicar em `Cozinha`, a aplicacao navega para `/cozinha` e marca `Cozinha` como ativa.
- Ao clicar em `Entregas`, a aplicacao volta para `/motoboy` e marca `Entregas` como ativa.
- O logout funciona nas duas telas.
