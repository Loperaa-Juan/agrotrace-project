# **Experimentos con Machine Learning**

En **Agrotrace** los algoritmos de Inteligencia Artificial (en este caso de Deep Learning) hacen parte del core de la aplicación: a partir de una foto tomada con el celular, un modelo de visión artificial clasifica la calidad de una fruta como **buena** o **mala**. Así, el agricultor puede verificar la calidad de su producto al publicar una oferta y el comprador recibe información más confiable sobre lo que adquiere.

Esta carpeta (`ml/`) reúne todo lo relacionado con el **entrenamiento** de esos modelos: la preparación de los datos, los experimentos, la evaluación y la exportación. La **inferencia** en producción no vive aquí, sino en el microservicio `ai-service/` (FastAPI), que solo carga los modelos ya exportados.
