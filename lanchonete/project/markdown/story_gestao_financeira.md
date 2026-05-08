# User Story: Gestão Financeira e Relatórios Consolidados

Esta funcionalidade foi implementada para fornecer ao administrador um controle rigoroso sobre o fluxo de caixa diário e uma visão estratégica do faturamento a longo prazo.

## 1. Fluxo de Caixa (Abertura e Fechamento)
O sistema agora permite rastrear o dinheiro físico que entra e sai da gaveta.

- **Abertura**: O operador informa o valor em dinheiro disponível para troco.
- **Fechamento**: O operador informa o valor total em dinheiro que está fisicamente no caixa.
- **Conferência**: O sistema calcula automaticamente o valor esperado (Dinheiro Inicial + Vendas em Dinheiro) e compara com o valor informado, exibindo a "Quebra de Caixa" (sobra ou falta).

## 2. Relatórios Gerenciais (Visão Total)
Permite ao dono da lanchonete analisar a performance do negócio em períodos maiores, unindo todos os fechamentos de caixa.

- **Filtros Inteligentes**: Visualização rápida por **Semana**, **Mês**, **Ano** ou **Todo o Período**.
- **Métricas Consolidadas**:
  - Faturamento Bruto (Total de Vendas).
  - Ticket Médio (Média de gasto por pedido).
  - Total de Taxas de Entrega arrecadadas.
  - Divisão percentual por forma de pagamento (PIX vs Dinheiro vs Cartão).

## 3. Regras de Manutenção
- **Desvinculação de Produtos**: Categorias podem ser excluídas sem a necessidade de deletar os produtos vinculados. Os produtos tornam-se "sem categoria" automaticamente.
- **Estabilização de Dados**: Otimização de performance para evitar múltiplas requisições ao banco de dados durante a visualização de relatórios.

---
*Data: 08/05/2026*
*Status: Implementado e Migrado*
