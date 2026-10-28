# **Experimentos con Machine Learning**

En **Agrotrace** los algoritmos de Inteligencia Artificial (en este caso de Deep Learning) hacen parte del core de la aplicación: a partir de una foto tomada con el celular, un modelo de visión artificial clasifica la calidad de una fruta en tres estados: **Fresh** (fresca), **Mild** (estado intermedio) o **Rotten** (podrida). Así, el agricultor puede verificar la calidad de su producto al publicar una oferta y el comprador recibe información más confiable sobre lo que adquiere.

Esta carpeta (`ml/`) reúne todo lo relacionado con el **entrenamiento** de esos modelos: la preparación de los datos, los experimentos, la evaluación y la exportación. La **inferencia** en producción no vive aquí, sino en el microservicio `ai-service/` (FastAPI), que solo carga los modelos ya exportados.

## **Experimentos**

| Notebook | Propósito | Salida |
| --- | --- | --- |
| [`segmentation_algorithm.ipynb`](segmentation_algorithm.ipynb) | Detectar y recortar la fruta con **YOLOE** | Bounding box de la fruta |
| [`fruit_dataset.ipynb`](fruit_dataset.ipynb) | Construir el dataset de tres clases | Dataset publicado en Hugging Face |
| [`classification_algorithm.ipynb`](classification_algorithm.ipynb) | Entrenar el clasificador con **MobileNetV2** | `tf_model_mobilenetv2.onnx` |

### **Segmentación** (`segmentation_algorithm.ipynb`)

Detección y recorte de la fruta con **YOLOE** (`ultralytics`) antes de clasificarla. Los datasets públicos de entrenamiento traen la fruta bien encuadrada, pero en producción las fotos tomadas con el celular incluyen fondo y otros objetos. Por eso, primero se localiza la fruta con un bounding box y se recorta.

Se carga la arquitectura de solo detección con los pesos `-seg` para inferir en CPU (la instancia de AWS no tiene GPU) y se prueba con las 10 frutas de [FruQ-DB](https://zenodo.org/records/7224690).

### **Dataset** (`fruit_dataset.ipynb`)

Construcción del dataset de entrenamiento para clasificar la fruta en tres estados: **Fresh**, **Mild** y **Rotten**. Casi todos los datasets públicos solo separan `fresh` y `rotten`, así que se combinan cuatro fuentes y se mapean sus etiquetas a esas tres clases:

- [FruQ-multi](https://zenodo.org/records/7224690)
- FruitVision (manzana)
- Avocado Ripening Dataset (índice 2–3 → Fresh, 4 → Mild, 5 → Rotten; el 1, aguacate inmaduro, se descarta)
- AgriFresh NET

**Limpieza:** FruQ-multi se limpia con SHA-256 y pHash: se eliminan los casi-duplicados con etiquetas distintas (fronteras ambiguas entre clases), pero no se deduplica dentro de cada clase porque pHash no capta los cambios de color del deterioro.

**Split y recorte:** se hace un split estratificado por fruta y estado (85% train, 10% test, 5% eval) con aguacate, banano, pepino, papaya y tomate, y cada imagen se recorta con YOLOE (ver `segmentation_algorithm.ipynb`). Se guardan las imágenes originales, los recortes y un `metadata.csv`; de 21.340 imágenes quedan 10.851 con fruta detectada.

**Publicación:** la carpeta completa se publica en Hugging Face como [`Juanxxo/agrotrace`](https://huggingface.co/datasets/Juanxxo/agrotrace) para usarla en los notebooks de entrenamiento.

Corre en Colab y guarda el progreso en Google Drive.

### **Clasificación** (`classification_algorithm.ipynb`)

Entrenamiento del clasificador de calidad (**Fresh**, **Mild**, **Rotten**) con **TensorFlow/Keras** y transfer learning sobre **MobileNetV2** preentrenado en ImageNet.

- **Datos:** se descargan solo los recortes (`crops/`) de [`Juanxxo/agrotrace`](https://huggingface.co/datasets/Juanxxo/agrotrace), porque en producción el modelo recibe el recorte de YOLOE, y se cargan con `image_dataset_from_directory` a 224×224.
- **Augmentation y desbalance:** al split de train se le aplica data augmentation geométrico y de brillo/contraste (sin cambios de tono, porque el color es lo que distingue el deterioro) y se usan class weights para compensar el desbalance (Mild es la clase con menos imágenes).
- **Arquitectura:** la base de MobileNetV2 se congela y solo se entrena la cabeza (`GlobalAveragePooling2D` + `Dropout` + `Dense` de 3 clases); el redimensionado y el `preprocess_input` van dentro del modelo, que acepta recortes de cualquier tamaño.
- **Resultado:** tras 50 épocas llega a ~82% de accuracy en test (en esta versión test también se usó como validación durante el entrenamiento).
- **Exportación:** el modelo se exporta como SavedModel y se convierte a ONNX con `tf2onnx` (`tf_model_mobilenetv2.onnx`) para el microservicio `ai-service/`.

Corre en una GPU A100 de Runpod conectada a VS Code como servidor Jupyter remoto.
