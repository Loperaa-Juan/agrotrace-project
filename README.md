# AgroTrace

## Descripción

**AgroTrace** es una plataforma que conecta de manera segura y transparente a compradores (personas y negocios) con agricultores locales. Los agricultores publican sus cosechas y los compradores las exploran, hacen pedidos y los reciben con un código de entrega seguro.

La calidad de lo que se vende es verificable: a partir de una foto tomada con el celular, un modelo de visión artificial clasifica la fruta como **fresca**, en **estado intermedio** o **podrida**. Así, el agricultor respalda su producto al publicar una oferta y el comprador recibe información más confiable sobre lo que adquiere.

El sistema se organiza como un monorepo con cuatro componentes:

| Carpeta | Componente | Descripción |
|---|---|---|
| [`frontend/`](frontend/README.md) | Aplicación web | Interfaz en React para compradores y agricultores. |
| [`backend/`](backend/README.md) | Microservicios | API en NestJS: usuarios, catálogo y ofertas, y pedidos. |
| [`ai-service/`](ai-service/README.md) | Visión artificial | Servicio en FastAPI que detecta y clasifica la calidad de la fruta. |
| [`ml/`](ml/README.md) | Experimentos de ML | Entrenamiento y evaluación de los modelos que usa el `ai-service`. |
