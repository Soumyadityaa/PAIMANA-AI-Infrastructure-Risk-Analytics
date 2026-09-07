# PAIMANA AI: Infrastructure Risk Analytics & Decision Support System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![XGBoost](https://img.shields.io/badge/ML-XGBoost-1572B6.svg?style=flat&logo=scikitlearn)](https://xgboost.readthedocs.io/)
[![Chart.js](https://img.shields.io/badge/Charts-Chart.js-FF6384.svg?style=flat&logo=chartdotjs)](https://www.chartjs.org/)
[![Leaflet](https://img.shields.io/badge/GIS-Leaflet.js-199900.svg?style=flat&logo=leaflet)](https://leafletjs.com/)
[![Dataset-MoSPI](https://img.shields.io/badge/Dataset-MoSPI%20July%202026-orange.svg)](https://paimana.mospi.gov.in)

PAIMANA AI is a full-stack infrastructure intelligence platform designed to monitor, predict, and mitigate time and cost overruns across 1,775 mega and major central infrastructure projects in India. Built on official monitoring schemas from the Ministry of Statistics and Programme Implementation (MoSPI), the application combines predictive ML regression, geospatial tracking, what-if prescriptive simulation, and an NLP-driven query assistant.

---

## System Architecture

```text
                                  +---------------------------------------+
                                  |    Official MoSPI CRIP Flash Report   |
                                  |         (1,775 Projects Dataset)      |
                                  +---------------------------------------+
                                                      |
                                                      v
                                      +-------------------------------+
                                      |   Data Preprocessing & Feature|
                                      |     Engineering Pipeline      |
                                      +-------------------------------+
                                                      |
                                                      v
+------------------------------------+  Trained Models  +-------------------------------------+
|    `train_models.py` Pipeline      | ---------------> | `xgboost_risk_model.pkl`            |
| - XGBoost Regressor (Cost Overrun) |                  | `model_features.pkl`                |
| - Baseline Dummy Benchmark         |                  | `model_metrics.json`                |
+------------------------------------+                  +-------------------------------------+
                                                                          |
                                                                          v
+---------------------------------------------------------------------------------------------+
|                                    FastAPI Backend (`main.py`)                              |
| - GET  `/api/dashboard`     : Serves normalized records with state geocodes & risk scores   |
| - POST `/api/predict`       : Real-time cost overrun inference for simulation modeling      |
| - GET  `/api/model-metrics` : Feature importance rankings and R² benchmarking metrics       |
| - POST `/api/chat`          : Natural language dataframe filtering & intelligence query     |
+---------------------------------------------------------------------------------------------+
                                       ^            ^            ^
                                       |            |            |  REST API / CORS
                                       v            v            v
+---------------------------------------------------------------------------------------------+
|                                 Frontend Web Interface (`/`)                                |
|  - Monitoring Dashboard (`index.html`): Portfolio KPIs, Bar Overview, GIS Map, 20-row table |
|  - Predictive Models (`predictive-models.html`): XGBoost dynamic feature importance weights |
|  - Benchmarking (`benchmarking.html`): Radar chart comparing ML vs. baseline models         |
|  - Early Warnings (`early-warnings.html`): Critical risk flag feed with direct mitigation   |
|  - Prescriptive Portal (`prescriptive-admin.html`): What-If intervention simulator          |
|  - LLM Assistant (`llm-assistant.html`): NLP search querying active project parameters      |
+---------------------------------------------------------------------------------------------+


