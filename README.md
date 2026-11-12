<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f5063440-e4ad-406a-b5e5-af6edade32fb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Planejamento das Congregações

- **Congregações** (`/congregations`): cadastro das igrejas e grupos do distrito com endereço, ancião/dirigente (link direto para WhatsApp), número de membros e meta de batismos com barra de progresso.
- **Planejamento** (`/planning`): grade mensal (datas × congregações) para cada tipo de culto — Culto Divino, Culto Jovem/Tarde, Domingo e Quarta. Em cada célula: pregador, tema, programação especial (Santa Ceia, Batismo, Dia Especial…) e marcação de **visita do pastor**.
  - Alerta de **conflito** quando o pastor está marcado em duas congregações no mesmo culto.
  - Lista das congregações **sem visita pastoral** no mês.
  - Botões **Copiar p/ WhatsApp** (escala formatada) e **Imprimir**.
- O Dashboard mostra quem prega em cada congregação no próximo sábado.

Líderes e administradores editam; todos os membros visualizam. Publique as novas regras com `firebase deploy --only firestore:rules`.
