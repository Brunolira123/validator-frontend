# Validador VR: Frontend

PWA (React + TypeScript + Vite + Tailwind) do Validador de Infraestrutura. O backend e o `docker-compose.prod.yml` ficam no repositório `validator-infra`.

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:5173 (o Vite encaminha /api para localhost:8080)
npm run build
```

## Imagem Docker (produção)

Build multi-stage: Node compila o app e a imagem final é um nginx que serve o PWA e encaminha `/api/*` para o container `backend:8080` (ver `nginx.conf`). Os endpoints de debug `/api/vision` e `/api/motor` são bloqueados (404).

A imagem vai para o repositório **privado** `brunoliraarcia/validator-frontend` no Docker Hub, **sempre com a mesma tag do backend**: se só um dos dois mudou, os dois são publicados de novo com a tag nova.

```bash
TAG=1.0.0

docker login -u brunoliraarcia
docker build -t brunoliraarcia/validator-frontend:$TAG .
docker push brunoliraarcia/validator-frontend:$TAG
```

Para testar a imagem localmente, sem o backend: `docker run --rm -p 8080:80 brunoliraarcia/validator-frontend:$TAG`. As telas abrem, mas as chamadas a `/api` retornam 502.

Como subir no servidor e atualizar: README do `validator-infra`, seção **Deploy em produção**.

---

## Notas do template (React + TypeScript + Vite)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
