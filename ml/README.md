# **Experimentos con Machine Learning**

En **Agrotrace** los algoritmos de Inteligencia Artificial (en este caso de Deep Learning) hacen parte del core de la aplicación: a partir de una foto tomada con el celular, un modelo de visión artificial clasifica la calidad de una fruta como **buena** o **mala**. Así, el agricultor puede verificar la calidad de su producto al publicar una oferta y el comprador recibe información más confiable sobre lo que adquiere.

Esta carpeta (`ml/`) reúne todo lo relacionado con el **entrenamiento** de esos modelos: la preparación de los datos, los experimentos, la evaluación y la exportación. La **inferencia** en producción no vive aquí, sino en el microservicio `ai-service/` (FastAPI), que solo carga los modelos ya exportados.

## **Experimentos**

| Notebook | Descripción |
| --- | --- |
| [`segmentation_algorithm.ipynb`](segmentation_algorithm.ipynb) | Detección y recorte de la fruta con **YOLOE** (`ultralytics`) antes de clasificarla. Los datasets públicos de entrenamiento traen la fruta bien encuadrada, pero en producción las fotos tomadas con el celular incluyen fondo y otros objetos. Por eso, primero se localiza la fruta con un bounding box y se recorta. Se carga la arquitectura de solo detección con los pesos `-seg` para inferir en CPU (la instancia de AWS no tiene GPU) y se prueba con las 10 frutas de [FruQ-DB](https://zenodo.org/records/7224690). |
