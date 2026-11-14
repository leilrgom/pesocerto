# Ajuste de identidade visual

Data: 14/11/2026.

O cabeçalho agora usa elementos reais separados: menu, logo com transparência e notificações. A imagem de referência aparece apenas no recorte visual dos animais, definido por CSS. O fundo da aplicação é contínuo; a faixa decorativa recortada foi retirada. Todas as telas usam a mesma largura máxima.

## Logo

Modo utilizado: ferramenta integrada ImageGen, edição com fundo transparente. Referência: `public/assets/logo.webp`. Arquivo final utilizado pelo aplicativo: `public/assets/logo-transparent.webp`, otimizado para WebP com alpha preservado. O original e `visualexato.png` foram preservados.

Prompt final:

> Reconstruct the supplied PESO CORRETO brand as a polished, perfectly clean flat/vector-style raster logo on ACTUAL transparent alpha background. This is not a pixel upscaling task: redraw smooth crisp edges and solid, fully opaque flat fills, eliminating all jpeg noise and mottling. Keep the same brand composition: left lime swoosh oval containing white farm-animal silhouettes and white weighing dial with green needle; right italic bold white PESO above lime CORRETO; small clean white tagline PESO CERTO. DECISÃO CERTA. Exact Portuguese spelling. Retain original animal silhouettes, proportions, orientation, typography style and original neon lime and white colors. No background rectangle. No texture, no distress, no halftone, no speckles, no scattered opaque fragments, no shadows, no embossing, no holes inside the letter strokes. Comfortable empty transparent padding on all sides; complete uncut logo. Wide landscape website-header asset.

O resultado foi inspecionado diretamente e em prévia sobre fundo verde, no tamanho de cabeçalho. O cache do service worker foi atualizado para carregar o novo arquivo e retirar os recortes antigos da lista de cache. A verificação visual de uma página renderizada no navegador permanece limitada pela indisponibilidade de navegador conectado.
