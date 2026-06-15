# Материалы для отчёта по практике: система EMeeting

Документ сжимает **техническую базу**, **алгоритмы**, **научные основания модулей анализа**, **схемы взаимодействия сервисов** и **ориентиры по коду** монорепозитория. **Корень репозитория:** `diplom/`; **этот файл:** `diplom/вкр/практика/practice.md`; **исходный код:** `diplom/code/`. Пути к файлам в таблицах ниже — **от `code/`**, если не указано иначе. Полные контракты и планы — в `code/docs/`, runbook — в корневом `README.md`.

Ранний прототип интерфейса (до текущей реализации) можно сопоставить с материалами в каталоге **`вкр/`** (например, `вкр/ui/схема ui.drawio`). Нижеследующие схемы отражают **актуальную** архитектуру стека EMeeting.

---

## 1. Цель и предмет разработки

**EMeeting** — программный комплекс для планирования онлайн-сессий, проведения видеовстречи в браузере, сбора аналитики по речи/лицу (через отдельный AI-шлюз) и просмотра отчётов. Практика охватывает полный цикл: UI, REST API, WebSocket, БД, опциональный стек ASR + gateway.

---

## 2. Состав системы (монорепозиторий)

| Компонент | Каталог | Роль |
|-----------|---------|------|
| **Frontend** | `emeeting-ui/` | SPA: React 19, TypeScript, Vite; маршруты, встреча, авторизация |
| **Backend** | `emeeting-backend/` | Go (Gin), JWT, PostgreSQL, REST + WS комнаты сессии |
| **AI Gateway** | `ai-gateway/` | Python: WS к backend; модули `modules/*` (лицо, аудио, отчёт), вызов `speech-service` |
| **Speech service** | `speech-service/` | FastAPI: HTTP `/v1/transcribe` (stub или faster-whisper) |
| **Документация** | `docs/` | API, контракты WS аналитики, наблюдаемость, дорожные карты AI |

**Оркестрация:** `docker-compose.yml` в корне `diplom/` (сервисы `db`, `backend`, `ui`; профиль `ai` — `speech-service`, `ai-gateway`).

**Схема потоков (упрощённо):**

```
[Браузер UI]
  | REST/JWT ───────────────────────────────────► [emeeting-backend] ◄──SQL──► [PostgreSQL]
  |                                                      ▲
  | WS /ws/sessions/:id (join, audio, frame, chat, …)    | WS-подключение шлюза
  └──────────────────────────────────────────────────────┤
                                                         │
  Ответы WS (аналитика, чат): ◄──────────────────────────┘
        ▲                    ▲
        │                    │
        └── publish ─────────┴── [ai-gateway] ──HTTP──► [speech-service /v1/transcribe]

Организатор: страницы /reports → GET /sessions/:id/analysis/report (итог из analysis_report в БД)
```

Клиент встречи шлёт по WS: `join`, `frame` (кадр лица для DeepFace/MediaPipe-пайплайна), `audio` (чанки WebM/opus для ASR), `chat_message`, `leave`, `end_meeting`. Backend рассылает события и для типов **`text_analysis`**, **`audio_analysis`**, **`face_analysis`**, **`analysis_report`*** , **`emotion`** выполняет **запись в `analysis_event` / отчёт** плюс broadcast. Тип **`face_debug`** только **рассылка** живым клиентам (в БД не пишется), но попадает в **in-memory `feature_store`** шлюза и влияет на заглушечный отчёт (`face_tracking_summary` и др.) — см. `code/docs/REPORTS_AND_ANALYTICS_STORAGE.md`.

---

## 3. Технологический стек

### 3.1. Frontend (`emeeting-ui`)

- **React** 19, **TypeScript**, **Vite** 7  
- **react-router-dom** — маршрутизация, **TanStack Query** — серверное состояние  
- **Zustand** — локальное состояние встречи (участники, тосты)  
- **Vitest** + Testing Library — unit-тесты  
- Маршруты отчётов: **`/reports`** (выбор сессии), **`/reports/:sessionId`** (детализация); конфиг роутера: `src/config/features.ts`
- Ключевые страницы: `Dashboard.tsx`, `Sessions.tsx` (ссылка «Отчёт»), `NewSession.tsx`, `VideoMeet.tsx`, `Login.tsx`, `Report.tsx`

### 3.2. Backend (`emeeting-backend`)

- **Go** 1.23+, модуль `emeeting`  
- **Gin** — HTTP, **gorilla/websocket** — WS  
- **golang.org/x/crypto/bcrypt** — пароли  
- **github.com/golang-jwt/jwt/v5** — access/refresh  
- **lib/pq** — драйвер PostgreSQL  
- Точка входа: `cmd/server/main.go` — подключение БД, CORS, middleware, регистрация модулей маршрутов

### 3.3. AI и речь

- **ai-gateway:** Python **3.11** (ориентир для Docker и `mediapipe` в `requirements.txt` ограничен `python_version < "3.13"`); декларативный конфиг **`modules*.json`**, исполняемая логика в **`modules/`** (`modules/face/`, `modules/audio/`, `modules/report/`), реестр `modules/registry.py`; legacy-шимы в `plugins/` при необходимости  
- **Лицо:** DeepFace → события `face_analysis` + legacy `emotion`; опционально **MediaPipe Face Landmarker** → `face_behavior`, отладочные **`face_debug`** (флаги `mediapipe_*`, `emit_debug_face`). В Dockerfile gateway — **`libegl1`**, **`libgles2`** для vision-задач  
- **Отчёт:** `report_loop` + `stub_builder` — правило-based агрегат (`meeting_summary`, `participant_tiles`, таймлайны, `face_tracking_summary` при наличии `face_debug` в feature store и т.д.)  
- **speech-service:** FastAPI, режимы `SPEECH_ASR_ENGINE=stub|whisper` (см. `speech-service/README.md`; faster-whisper / CTranslate2 при `whisper`)

---

## 4. Backend: модули и порядок middleware

Из `cmd/server/main.go`:

1. `gin.Recovery()`, `RequestID`, `AccessLog`  
2. **CORS** (origins из `CORS_ALLOW_ORIGIN`)  
3. `RateLimitLogin()` — ограничение попыток входа  
4. `RequireAuth()` — для защищённых маршрутов (публичные исключения заданы в middleware)  
5. Модули: `health`, `auth`, `session`, `analysis`, `reports`, `ws`

**Сессии и WebSocket:** `internal/session/` — хаб соединений, обработчики типов сообщений (`join`, `leave`, `frame`, `audio`, …), upgrade WS, лимит размера сообщения (`wsMaxMessageBytes`).

**Аналитика:** `internal/analysis/` — запись входящих WS-сообщений аналитики, выдача по REST с правилами доступа (организатор vs участник с `participant_id`).

---

## 5. Алгоритмы и логика (для текста отчёта)

### 5.1. Авторизация

1. Клиент отправляет `POST /auth/login` с email и паролем.  
2. Сервер проверяет пользователя в БД, сравнивает пароль с **bcrypt**-хешем.  
3. Выдаётся пара **access** (короткий TTL) и **refresh** токенов; refresh хранится в БД с возможностью ротации.  
4. Последующие запросы: заголовок `Authorization: Bearer <access>` или cookie (в зависимости от реализации UI).  
5. Обновление сессии: `POST /auth/refresh` с телом, содержащим refresh-токен.

*Детали контрактов:* `docs/api-contract.md`, код `internal/auth/`.

**Замечание про отчёт:** просмотр агрегированной аналитики по завершённой сессии в UI связан не с общим ресурсом `GET /reports/:id` legacy, а с **`GET /sessions/:id/analysis/report`** для организатора (`docs/api-contract.md`).

### 5.2. Подключение к встрече по WebSocket

1. Клиент открывает `WebSocket` на URL вида `…/ws/sessions/:sessionId` (в dev — `ws://localhost:8080/ws/sessions/:id`; за прокси — относительный префикс из `VITE_WS_URL`).  
2. После `onopen` клиент шлёт сообщение **`join`** с `participant_id`, в `payload` — имя и роль (`host` / `participant`).  
3. **Backend** (`joinHandler` в `ws_handler.go`): сохраняет метаданные соединения, рассылает legacy `join`, затем событие **`user_joined`**, новому клиенту — **`participants_snapshot`** со списком уже подключённых.  
4. Дальнейшие сообщения (`chat_message`, `frame`, `audio`, …) обрабатываются зарегистрированными обработчиками: тип **`face_debug`** только **broadcast**; типы **`text_analysis`**, **`audio_analysis`**, **`face_analysis`**, **`analysis_report`**, **`analysis_report_partial`**, **`emotion`** — **persist + broadcast** в `analysis_event` (при ошибке записи клиент может не узнать, см. логи backend).

### 5.3. Список участников и завершение встречи

- Состояние участников на клиенте обновляется обработчиком **`handleMeetingEvent`** по типам `user_joined`, `user_left`, `participants_snapshot`, а также legacy `join`/`leave`.  
- При **`meeting_ended`** UI переходит к списку сессий (колбэк в `VideoMeet`).

### 5.4. Захват аудио для ASR (браузер)

Реализовано в `useMeetingAudioChunks.ts`:

1. Берётся **только аудиодорожка** микрофона (`MediaStream` с audio tracks).  
2. Создаётся **`MediaRecorder`** с подбором поддерживаемого MIME (webm/opus и др.).  
3. По тайм-слайсу накапливаются куски **в один непрерывный буфер** (важно для корректного WebM: init-сегмент + кластеры).  
4. Периодически или по лимиту времени/размера буфер кодируется в **Base64** и отправляется по WS типом **`audio`** (поля согласованы с gateway).  
5. При остановке/смене потока — корректная отмена и освобождение recorder.

### 5.5. Захват видеокадров для анализа лица

- В `VideoMeet.tsx` по интервалу (например ~320 ms) вызывается захват кадра с `<video>` и отправка **`frame`** с полезной нагрузкой (например JPEG base64).  
- Ответы/события аналитики приходят тем же WS: `face_analysis`, legacy `emotion`, опционально `face_debug`.

### 5.6. Транскрипт в UI

- События **`text_analysis`** содержат `transcript_partial` / `transcript_final`, `stage`, `trace_id`.  
- В UI для одного спикера поддерживается **один «черновик»** на `participant_id` (стабильный `traceId` вида `asr-draft:<pid>`), финальная реплика добавляется отдельной строкой.  
- Отображение: хронологическая лента в правой панели (`MeetingTranscriptRail.tsx`).

### 5.7. Speech-service

1. **POST** `/v1/transcribe` с JSON: `session_id`, `participant_id`, `trace_id`, `audio` (base64, mime, язык).  
2. Режим **stub** — детерминированный ответ без распознавания.  
3. Режим **whisper** — декодирование base64, вызов faster-whisper через `asr_whisper.py`, возврат partial/final и `text_features`.

### 5.8. AI Gateway (концептуально)

- Читает конфиг модулей (`modules.default.json` / `modules.docker.json`), hot-reload по `AI_GATEWAY_CONFIG_POLL_SEC`.  
- Цепочки: **аудио** → признаки `audio_analysis` и при включённом `text` модуле HTTP в **speech-service** → `text_analysis`; **кадр** (`frame`) → `face_analysis`, опционально `face_behavior`, `face_debug`; **report_loop** → периодические `analysis_report_partial` и финальный `analysis_report` при остановке цикла (отключение WS шлюза).  
- Ограничение параллелизма лицевого инференса: семафор **`max_concurrent_inferences`** (по умолчанию 2).  
- Подробности: `ai-gateway/MEMO.md`, `docs/ANALYSIS_WS_CONTRACTS.md`, `docs/REPORTS_AND_ANALYTICS_STORAGE.md`.

### 5.9. Отчёт и доступ к нему в реализации

- **UI:** `Report.tsx`, REST **`GET /sessions/:id/analysis/report`** (только **организатор** — см. backend и `docs/api-contract.md`).  
- **Структура stub-ответа** (расширяемая): `meeting_summary` (распределение эмоций с полями `emotion`/`events`/доли, текстовые `highlights_ru`, рейтинг вовлечённости, `coverage`), `participant_tiles`, `timelines`, `observations`, при наличии данных — `face_tracking_summary`, `face_behavior_summary`; базовые `summary`, `participants`, `fusion`. Источник логики: `ai-gateway/modules/report/stub_builder.py`.

---

## 5A. Научные и инженерные основания модулей (для раздела ВКР / теории)

Ниже — краткая выжимка **для ссылок в пояснительной записке**. Формулировки можно перенести почти дословно с указанием источников; DOI/arXiv даны там, где стандартны.

### 5A.1. Детекция лица и трекинг: от ограничивающего прямоугольника к «точкам»

**Задача:** на изображении $I$ локализовать лицо и оценить набор ключевых **ландмарок** $\{(x_k, y_k)\}_{k=1}^{K}$ (контуры глаз, носа, рта, околовиличная область).

**Исторический контекст:** классический подход — **Active Shape Models (ASM)** и **Active Appearance Models (AAM)** (компактное параметрическое представление формы лица статистикой формы и текстуры) [Cootes et al.](https://www.sciencedirect.com/science/article/abs/pii/S1077314202909041). Современный стандарт для практических систем — полносверточные **регрессоры**, предсказывающие координаты точек напрямую по изображению или по ROI после детектора (семейства BlazeFace/MediaPipe Face Detection, MTCNN и др.).

**Как связано с текущей реализацией:** кадры с камеры браузера кодируются и передаются на шлюз; модуль лица выполняет **детект**, при необходимости **выравнивание (alignment)** перед DeepFace (`align` в конфиге), затем классификацию эмоции. Опциональный **Face Landmarker** **MediaPipe** строит **плотную сетку** (сотни 3D-подобных опорных точек на лицевой меше с последующей проекцией) для оценки **blendshape**-коэффициентов (приближение активности групп лицевых мышц) и **ориентации головы** (углы yaw/pitch/roll). Инженерное описание и ссылки на whitepaper/Google AI: официальный хаб решения **[Face landmarks detection (MediaPipe)](https://developers.google.com/mediapipe/solutions/vision/face_landmarker)**; обзор идеи смежных задач можно опереть на публикации по **«facial landmarks» + deep learning**, например обзоры FERA / CVPR-tutorial материалы.

**Дополнительно для текста отчёта:** различите **геометрический трекинг** (устойчивая нумерация точек между кадрами при стабильном детекте) и **семантический смысл** точек как базиса для **описания выражения**; в приложении см. расширение контракта `face_behavior` в `docs/ANALYSIS_WS_CONTRACTS.md`.

### 5A.2. Распознавание эмоции по лицу (FER)

**Эмоция как класс:** типичная постановка — многоклассовая классификация по изображению лица (**Facial Expression Recognition**). Продуктивные решения объединяют детект/выравнивание и **CNN**/`EfficientNet`-подобные бэкенды; в коде используется **DeepFace** (мета-библиотека с несколькими предобученными моделями). Для научной ссылки имеет смысл цитировать **обзоры FER** (напр. журнальные обзоры 2019–2023 по deep FER и датасетам FER2013/AffectNet) или оригинальные архитектуры конкретных бэкендов, которые включаете в текст (см. список провайдеров в документации DeepFace на GitHub — ссылочно на первоисточники моделей).

### 5A.3. Транскрибация речи в текст (ASR): цепочка в системе и теория

**В приложении:** поток браузера `MediaRecorder` → чанки **WebM/opus** (бинарное сжатие речи без явного разделения на фонемы на клиенте) → **ai-gateway** → HTTP **POST `/v1/transcribe`** → в режиме `whisper` — **Whisper-small/medium/etc.** через **[faster-whisper](https://github.com/SYSTRAN/faster-whisper)** (ускорение на базе **[CTranslate2](https://github.com/OpenNMT/CTranslate2)**.

**Научное ядро Whisper:** аудиокодек на входе переводится в частотную плоскость (**лог-Мел спектрограмма** коротких окон FFT), затем **encoder-decoder Transformer** с кросс-вниманием последовательно генерирует текстовые токены; обучение на большом смесевом массиве слабых супервизий. Оригинальная работа для библиографии:

> Radford A. et al. **Robust Speech Recognition via Large-Scale Weak Supervision**. Proc. ICML **2023**; также технический препринт **arXiv:2212.04356** — `https://arxiv.org/abs/2212.04356`

Темы для раздела «теория» в отчёте: **attention / Transformer** (общие работы Vaswani et al., «Attention Is All You Need», NeurIPS 2017, arXiv:1706.03762); **CTC / seq2seq** как альтернативы (для исторического сравнения с энкодер-декодер ASR до эры LLM-whisper-подхода); ограничения **streaming** против **батч-декода** файлом (partial/final в контракте UI).

### 5A.4. Простые признаки аудиочанков (до «тяжёлого» SER)

В режиме `audio_analysis` на шлюзе считаются **прокси-признаки** активности речи без полного ASR по каждому кадру декодированного PCM: энергия, предполагаемая **битрейт-связность**, грубая оценка **пауз**. Для усиления теоретической части можно сослаться на классические **VAD (Voice Activity Detection)** и описания признаков **MFCC**/энергетических контуров (Rabiner & Schafer по основам ЦОС речи либо учебники ASR Huang, Acero, Hon).

### 5A.5. Агрегирование отчёта без финальной НС в разработческой версии

В проекте **итог по встрече** формируется **правилами** по накопленным фичам (окна по времени, счётчики эмодоминант, вклад транскрипта, качество прохождения «gate» для `face_debug`). Для ВКР это можно охарактеризовать как **late fusion** многомодальных сигналов на уровне статистик (с отсылкой к обзорам multimodal sentiment / meeting understanding), а путь с **«своей НН»** оставить как этап `own_nn_url` в конфигурации gateway.

---

## 5B. Краткая библиография и ссылки для дальнейшего оформления по ГОСТу

Форматы оформления (ГОСТ Р 7.0.5 / 7.0.100) нужно будет привести к требованиям вашей кафедры самостоятельно; здесь дан **поисковый ключ** или стабильный URL.

| Тема | Куда сослаться в пояснительной записке |
|------|---------------------------------------|
| AAM/ASM статистических моделей лица | Cootes T., Edwards G., Taylor C. Active appearance models (*устаревшие, но хороши для истории темы ASM*) |
| Transformer (общая база Whisper и современных ASR/LLM) | Vaswani et al., 2017, arXiv:1706.03762 |
| Whisper (основная ссылка на ASR в стеке) | Radford et al., Robust Speech Recognition…, ICML 2023 / arXiv:2212.04356 |
| faster-whisper / CTranslate2 | репозитории GitHub SYSTRAN/faster-whisper, OpenNMT/CTranslate2 (как инженерный ускоритель) |
| MediaPipe Face Landmarker | официальная документация Google + раздел citations на странице решения |
| DeepFace как обёртка FER-моделей | репозиторий [serengil/deepFace](https://github.com/serengil/deepface) — в тексте перечислить выбранный `detector_backend`/`model_name` и дать первоисточники соответствующих сетей (VGG-Face, Facenet512, … как в документации пакета) |
| Обзор deep-learning FER | Li Y., Deng S. Deep Facial Expression Recognition: A Survey. *IEEE Trans. Pattern Anal. Mach. Intell.* (TPAMI); препринт на arXiv (поиск по названию для актуальной версии) |
| Датасеты выражений | **FER2013**, **AffectNet** — для обоснования постановки классификации эмоций в разделе «аналоги и литература» |
| Детект лица (скорость) | BlazeFace ([Bazarevsky et al., CVPR Workshops 2019](https://research.google/pubs/pub49958/)) как пример архитектур для real-time ROI |
| Multimodal / emotional meeting analysis | обзоры по запросам *multimodal emotion recognition*, *multimodal meeting understanding* — для абзаца про перспективу отчётной НН и late fusion |

PDF по открытым источникам: **arxiv.org/abs/2212.04356**, **arxiv.org/abs/1706.03762**; для платных изданий — библиотека вуза / DOI.

---

## 6. База данных

- Миграции: `emeeting-backend/migrations/up/*.sql` и `down/`.  
- Сущности (по именам файлов миграций): пользователи и auth, сессии, участники встречи, состояние митинга, refresh-токены, события auth, аналитика (`analysis`), чат сессии и т.д.  
- Описание порядка применения: `emeeting-backend/migrations/README.md`.

---

## 7. Контракты REST и WS (где искать)

| Тема | Файл |
|------|------|
| REST v1 (логин, сессии, чат, аналитика, права отчёта организатору) | `docs/api-contract.md` |
| Отчёт UI (`/reports`), матрица persist, поля stub-отчёта | `docs/REPORTS_AND_ANALYTICS_STORAGE.md` |
| WS-типы аналитики (`text_analysis`, `face_analysis`, `face_debug`, отчёты) | `docs/ANALYSIS_WS_CONTRACTS.md` |
| Метрики и логирование | `docs/ANALYSIS_OBSERVABILITY.md` |
| План развития AI | `docs/AI_STUB_TO_PRODUCTION_ROADMAP.md` |

---

## 8. Листинги и опорные фрагменты кода

Ниже — **сокращённые** фрагменты; полный код в указанных файлах.

### 8.1. Регистрация сервера и модулей (Go)

```24:65:emeeting-backend/cmd/server/main.go
func main() {
	postgresDSN := getEnv("POSTGRES_DSN", "postgres://postgres:1040@localhost:5432/emeeting?sslmode=disable")
	serverPort := getEnv("SERVER_PORT", "8080")
	corsOrigin := getEnv("CORS_ALLOW_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173")

	// DB
	database, err := db.NewPostgres(postgresDSN)
	if err != nil {
		log.Fatal("DB connection failed:", err)
	}

	// gin
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.RequestID())
	r.Use(middleware.AccessLog())

	allowedOrigins := splitCSV(corsOrigin)
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowOriginFunc:  isAllowedDevOrigin(allowedOrigins),
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           12 * 60 * 60,
	}))

	r.Use(middleware.RateLimitLogin())
	r.Use(middleware.RequireAuth())

	modules := []server.RouteModule{
		health.NewModule(database),
		auth.NewModule(database),
		session.NewModule(database),
		analysis.NewModule(database),
		reports.NewModule(),
		ws.NewModule(),
	}
	for _, module := range modules {
		module.RegisterRoutes(r)
	}
	// ...
}
```

### 8.2. Обработка `join` на backend: user_joined + snapshot

```59:96:emeeting-backend/internal/session/ws_handler.go
	joinHandler := func(sessionID int, conn *websocket.Conn, msg WSMessage) {
		var name string
		if msg.Payload != nil {
			if m, ok := msg.Payload.(map[string]any); ok {
				if v, ok := m["name"].(string); ok {
					name = v
				}
			}
		}
		pid := strings.TrimSpace(msg.Participant)
		if pid != "" && conn != nil {
			h.hub.SetJoinMeta(sessionID, conn, pid, name)
		}

		h.hub.Broadcast(sessionID, msg)

		payload, _ := json.Marshal(map[string]any{
			"participant_id": msg.Participant,
			"name":           name,
			"joined_at":      msg.Timestamp.UTC(),
		})
		h.hub.Broadcast(sessionID, WSEvent{
			Type:      "user_joined",
			Payload:   payload,
			Timestamp: time.Now().UTC(),
		})

		if conn != nil {
			snap := h.hub.ParticipantSnapshot(sessionID)
			snapBody, _ := json.Marshal(map[string]any{"participants": snap})
			h.hub.SendJSON(conn, WSEvent{
				Type:      "participants_snapshot",
				Payload:   snapBody,
				Timestamp: time.Now().UTC(),
			})
		}
	}
```

### 8.3. Связка WS встречи на клиенте

```1:31:emeeting-ui/src/features/meeting/useMeetingWebSocket.ts
import { useMeetingStore } from "./useMeetingStore";
import { handleMeetingEvent } from "./handleMeetingEvent";
import { useSessionWS } from "../../hooks/useSessionWS";

export function useMeetingWebSocket(
  sessionId: string,
  participantId: string,
  onMessage?: (msg: unknown) => void,
  onMeetingEnded?: (payload: unknown) => void
) {
  const upsertParticipant = useMeetingStore((s) => s.upsertParticipant);
  const removeParticipant = useMeetingStore((s) => s.removeParticipant);
  const replaceParticipantsFromSnapshot = useMeetingStore((s) => s.replaceParticipantsFromSnapshot);
  const pushToast = useMeetingStore((s) => s.pushToast);

  return useSessionWS(
    sessionId,
    participantId,
    (msg) => {
      handleMeetingEvent(msg, {
        upsertParticipant,
        removeParticipant,
        replaceParticipantsFromSnapshot,
        pushToast,
        onMeetingEnded,
      });
      onMessage?.(msg);
    },
    { reconnect: true }
  );
}
```

### 8.4. Разбор доменных событий встречи (фрагмент)

```20:50:emeeting-ui/src/features/meeting/handleMeetingEvent.ts
export function handleMeetingEvent(msg: unknown, ops: Ops) {
  if (!isRecord(msg)) return;
  const type = typeof msg.type === "string" ? msg.type : undefined;
  if (!type) return;

  const event = msg as WSEvent;
  const payload = event.payload;

  if (type === "user_joined" && isRecord(payload)) {
    const p = payload as unknown as UserJoinedPayload & Record<string, unknown>;
    const id = typeof p.participant_id === "string" ? p.participant_id : undefined;
    if (!id) return;
    const name = typeof p.name === "string" && p.name.length > 0 ? p.name : `Participant ${id}`;
    ops.upsertParticipant({ id, name });
    ops.pushToast?.(`${name} подключился(лась)`);
    return;
  }

  if (type === "user_left" && isRecord(payload)) {
    // ...
  }

  if (type === "meeting_ended") {
    ops.onMeetingEnded?.(payload);
    return;
  }
  // participants_snapshot, legacy join/leave …
}
```

### 8.5. Построение URL WebSocket на клиенте

```17:31:emeeting-ui/src/hooks/useSessionWS.ts
  const buildSocketUrl = (sid: string) => {
    const raw = (WS_URL || "").trim().replace(/\/+$/, "");
    if (raw.startsWith("ws://") || raw.startsWith("wss://")) {
      return `${raw}/ws/sessions/${sid}`;
    }
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const wsBase = raw.replace(/^http/i, "ws");
      return `${wsBase}/ws/sessions/${sid}`;
    }
    if (raw.startsWith("/")) {
      return `${raw}/sessions/${sid}`;
    }
    return `${DEFAULT_WS_URL}/ws/sessions/${sid}`;
  };
```

### 8.6. Идея useMeetingAudioChunks (заголовок и контракт)

```57:68:emeeting-ui/src/features/meeting/useMeetingAudioChunks.ts
/**
 * Sends periodic mic chunks over WS as `type: "audio"` for ai-gateway speech pipeline.
 *
 * MediaRecorder timeslice blobs are often **not** standalone WebM files; ffmpeg/Whisper needs
 * the initialization segment plus subsequent clusters. We concatenate all blobs since the last
 * segment boundary and POST that cumulative buffer so decoding stays stable.
 */
export function useMeetingAudioChunks(
  streamRef: React.RefObject<MediaStream | null>,
  send: (type: string, payload?: unknown) => void,
  opts: { enabled: boolean; mediaReady: boolean; streamEpoch?: number; timesliceMs?: number }
) {
```

### 8.7. Speech-service: модель запроса и stub

```44:57:speech-service/main.py
class TranscribeRequest(BaseModel):
    session_id: int
    participant_id: str
    trace_id: str
    audio: dict[str, Any] = {}


def _stub_response(req: TranscribeRequest) -> dict[str, Any]:
    return {
        "transcript_partial": f"[stub] session={req.session_id} participant={req.participant_id}",
        "transcript_final": None,
        "language": "ru",
        "text_features": {"confidence": 0.42, "sentiment": "neutral"},
    }
```

---

## 9. Тестирование и CI

- **Frontend:** `npm run lint`, `npm run test` (Vitest), `npm run build` — см. `.github/workflows/ci.yml` в корне `diplom/`.  
- **Backend:** `go vet ./...`, `go test ./...`, `go build ./...`.  
- **ai-gateway:** `python -m compileall .` в CI.

Примеры тестов UI: `emeeting-ui/src/features/meeting/handleMeetingEvent.test.ts`, `emeeting-ui/src/hooks/useSessionWS.test.tsx`.

---

## 10. Чек-лист формулировок для отчёта по практике

Можно напрямую разворачивать в разделы отчёта:

1. **Постановка задачи:** веб-платформа сессий и видеовстреч с аналитикой по речи/лицу и отчётностью для организатора.
2. **Проектирование:** клиент–сервер, REST + WebSocket, вынос ASR (`speech-service`) и мультимодального анализа (`ai-gateway`) в отдельные сервисы; маршруты `/reports`.
3. **Реализация:** стек по табл. §3; модули backend; UI (страницы встречи и отчёт); `ai-gateway/modules/*`, `report_loop`, hot-reload конфига.
4. **Безопасность:** HTTPS/wss в проде; bcrypt; JWT; rate limit на логин; разграничение REST-аналитики (организатор / участник с `participant_id`); отчёт сессии — организатор (`docs/api-contract.md`).
5. **Проверка:** unit-тесты, CI, ручной сценарий `docker compose` (при необходимости `--profile ai`).
6. **Научная часть:** ландмарки и blendshapes, FER, ASR Whisper/Transformer, простые аудиопризнаки, late fusion для отчёта (§5A, §5B).
7. **Заключение:** достигнутые результаты; ограничения: эвристический stub-отчёт, `face_debug` не сохраняется в `analysis_event`, латентность/partial ASR, большие WS-сообщения медиа.

---

## 11. Индекс файлов «для вставки в приложение к отчёту»

| Назначение | Путь |
|------------|------|
| Точка входа backend | `emeeting-backend/cmd/server/main.go` |
| WS сессии, join/leave/audio | `emeeting-backend/internal/session/ws_handler.go`, `hub.go` |
| Авторизация | `emeeting-backend/internal/auth/` |
| Страница встречи | `emeeting-ui/src/pages/VideoMeet.tsx` |
| Отчёт аналитики, маршруты `/reports` | `emeeting-ui/src/pages/Report.tsx`, `emeeting-ui/src/config/features.ts` |
| Правая панель (транскрипт, чат, люди) | `emeeting-ui/src/features/meeting/MeetingTranscriptRail.tsx` |
| События встречи в state | `emeeting-ui/src/features/meeting/handleMeetingEvent.ts` |
| WS hook | `emeeting-ui/src/hooks/useSessionWS.ts` |
| Аудио-чанки | `emeeting-ui/src/features/meeting/useMeetingAudioChunks.ts` |
| ASR HTTP | `speech-service/main.py`, `speech-service/asr_whisper.py` |
| Stub-отчёт, оркестрация | `ai-gateway/modules/report/stub_builder.py`, `ai-gateway/report_loop.py` |
| Face: DeepFace / MediaPipe | `ai-gateway/modules/face/analysis.py`, `mediapipe_landmarker.py`, `params.py` |
| Конфиг gateway | `ai-gateway/modules.default.json`, `modules.docker.json`, `gateway_config.py` |
| Анализ: persist, REST | `emeeting-backend/internal/analysis/`, регистрация WS в `session/ws_handler.go` |

---

## 12. Схемы моделирования (BPMN, IDEF0, DFD, ER, логическая БД)

Диаграммы ниже в формате **Mermaid** (рендер в GitHub, GitLab, VS Code / Cursor с предпросмотром Markdown) и **ASCII** для IDEF0. При требовании кафедры к «родным» BPMN/DFD в **draw.io / Visio** — импортируйте как подложку или перерисуйте по этим моделям.

### 12.1. BPMN (основной сценарий: от входа до встречи и аналитики)

Упрощённая модель с дорожками **Участник**, **emeeting-backend**, **Внешние сервисы** (профиль `ai`). Шлюз XOR: опциональное подключение ASR/gateway.

```mermaid
flowchart TB
  subgraph LaneU["Дорожка: Участник / организатор"]
    A([Старт]) --> B[Открыть приложение]
    B --> C{Есть валидный JWT?}
    C -->|Нет| D[POST /auth/login]
    D --> E[Получить access + refresh]
    E --> C
    C -->|Да| F[REST: сессии / открыть встречу]
    F --> F2[Организатор: /reports →\nGET …/analysis/report]
    F --> G[WebSocket /ws/sessions/:id]
    G --> H[join + медиа / чат]
    H --> I[leave или end_meeting]
    I --> K([Конец])
  end

  subgraph LaneB["Дорожка: emeeting-backend"]
    HB[join → user_joined +\nparticipants_snapshot]
    IB[v1-аналитика:\npersist analysis_event +\nbroadcast]
    ID[face_debug:\nтолько broadcast]
    JB[meeting_ended / disconnect]
  end

  subgraph LaneX["Дорожка: ai-gateway + speech-service\n(compose profile ai)"]
    IX[Приём audio / frame]
    IY[faster-whisper + модули\nface/report]
  end

  H -.-> HB
  H -.-> IB
  H -.-> ID
  H -.-> IX
  IX --> IY
  IY -.->|WS аналитика| IB
  IY -.->|опц. WS face_debug| ID
  I -.-> JB
```

**События и артефакты:** JWT; WS (`join`, `frame`, `audio`, `chat_message`); от шлюза — `text_analysis`, `audio_analysis`, `face_analysis`, `analysis_report*`; **`face_debug`** не пишется в БД (`docs/REPORTS_AND_ANALYTICS_STORAGE.md`). Контракт: `docs/ANALYSIS_WS_CONTRACTS.md`.

---

### 12.2. IDEF0, контекстная диаграмма A-0 (без декомпозиции)

Одна функция верхнего уровня — **«Обеспечить проведение веб-конференции и сбор аналитики в системе EMeeting»**. Стрелки ICOM:

| Тип | Содержание (по смыслу реализации) |
|-----|-----------------------------------|
| **Входы (Input)** | Учётные данные пользователя; команды и медиаданные (кадры, аудиочанки, текст чата); параметры сессии (название, время, тип). |
| **Выходы (Output)** | Отображение встречи и списков в UI; сохранённые записи аналитики и чата; агрегированные отчёты; уведомления участникам по WS. |
| **Управление (Control)** | Политики безопасности (JWT, rate limit логина); контракты REST/WS; настройки CORS и окружения Docker. |
| **Механизмы (Mechanism)** | Браузер (React); сервер `emeeting-backend` (Go); СУБД PostgreSQL; при включении — `ai-gateway` (Python), `speech-service` (FastAPI). |

ASCII-вид (для вставки в отчёт, если Markdown не рендерится):

```
                    ┌── Управление (Control) ──────────────────────────────┐
                    │ JWT, rate limit, контракты API/WS, CORS, compose    │
                    └──────────────────────────┬──────────────────────────┘
                                               │
  Входы (Input)                                ▼
  креды, медиа,          ┌─────────────────────────────────────────┐
  команды WS,      ───►  │  A-0: EMeeting — веб-конференция       │
  данные сессии          │      и аналитика                        │
                         └─────────────────┬───────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
           Выходы (Output)                               Механизмы (Mechanism)
           UI, отчёты, записи БД, WS-события              React, Gin, PostgreSQL,
                                                          ai-gateway, speech-service
```

---

### 12.3. DFD (потоки данных)

#### Уровень 0 (контекст)

```mermaid
flowchart LR
  U([Пользователь\nбраузер])
  SYS[[П0: Система\nEMeeting]]
  DB[(D1: PostgreSQL)]
  AI[[Внешний контур AI\n gateway + ASR]]

  U -->|запросы REST, WS,\nмедиа| SYS
  SYS -->|ответы, события WS| U
  SYS <-->|SQL| DB
  SYS <-->|опционально:\nHTTP / WS события| AI
```

#### Уровень 1 (основные процессы и хранилища)

```mermaid
flowchart TB
  U([Пользователь])

  subgraph Stores["Хранилища данных"]
    D_AUTH[(D2: auth_user,\nrefresh_tokens,\nauth_events)]
    D_SESS[(D3: session,\nmeeting_events,\nmeeting_participant)]
    D_ANA[(D4: analysis_event,\nanalysis_report)]
    D_CHAT[(D5: session_chat_message)]
  end

  P1[[P1:\nАутентификация]]
  P2[[P2:\nУправление сессиями]]
  P3[[P3:\nКомната встречи WS]]
  P4[[P4:\nПерсистенция аналитики]]
  P5[[P5:\nЧат сессии]]
  P6[[P6:\nОтчёты / выдача]]

  U -->|логин| P1
  P1 <-->|чтение/запись| D_AUTH
  U -->|CRUD сессий| P2
  P2 <-->|SQL| D_SESS
  U -->|WS медиа/чат| P3
  P3 <-->|участники, статус| D_SESS
  P3 -->|сохранить события| P4
  P4 <-->|вставка/выборка| D_ANA
  P3 -->|сообщения чата| P5
  P5 <-->|SQL| D_CHAT
  U -->|запрос отчёта| P6
  P6 <-->|SQL| D_ANA
  P6 -->|JSON отчёта| U
```

**Пояснение к потокам:** **P7 (внешний)** — процесс **`ai-gateway` + speech-service`: WS получает клиентские `audio`/`frame`, шлюз отправляет назад сообщения типов **`text_analysis`**, **`face_analysis`**, **`emotion`**, **`face_debug`**, **`analysis_report*`**; backend в **P3** принимает их как входящие WS и пересылает участникам. **P4** записывает в **D4** только те типы, для которых в `ws_handler.go` включён `persistBroadcast` (**`face_debug` не попадает** в таблицы аналитики). Для аккуратной DFD второго уровня нарисуйте **отдельно** узел «AI-шлюз» и два разных входа из него в P3: прозрачный broadcast против «с persist».

#### 12.3.1. Потоки аналитики: persist vs только live (`face_debug`)

```mermaid
flowchart LR
  GW[["ai-gateway"]]
  BK[["emeeting-backend\nWS handler"]]
  DB[["PostgreSQL"]]
  CL[["Клиенты\nкомнаты"]]

  GW -->|face_analysis,\ntext_analysis, …| BK
  BK -->|INSERT| DB
  BK -->|broadcast| CL

  GW -->|face_debug| BK
  BK -->|только broadcast| CL
  BK -.->|нет INSERT| DB
```

---

### 12.4. ER-диаграмма (сущности и связи по миграциям)

```mermaid
erDiagram
  auth_user {
    int auth_user_id PK
    string email UK
    string password_hash
    boolean is_active
    timestamptz created_at
    int failed_login_attempts
    timestamptz locked_until
  }
  refresh_tokens {
    bigint refresh_token_id PK
    string token_hash UK
    int user_id FK
    timestamptz expires_at
    timestamptz revoked_at
  }
  auth_events {
    bigint auth_event_id PK
    int auth_user_id FK
    string event_type
    timestamptz created_at
  }
  session {
    int session_id PK
    string title
    string session_type
    timestamp start_datetime
    int created_by FK
    string meeting_status
  }
  meeting_events {
    bigint meeting_event_id PK
    int session_id FK
    string event_type
    jsonb payload
  }
  meeting_participant {
    int meeting_participant_id PK
    int session_id FK
    int auth_user_id FK
    string role_code
    boolean is_active
  }
  analysis_event {
    bigint analysis_event_id PK
    int session_id FK
    string event_type
    string participant_id
    jsonb payload
  }
  analysis_report {
    bigint analysis_report_id PK
    int session_id FK
    string stage
    jsonb report
  }
  session_chat_message {
    bigint chat_message_id PK
    int session_id FK
    string participant_id
    text body
  }

  auth_user ||--o{ refresh_tokens : "user_id"
  auth_user ||--o{ auth_events : "auth_user_id"
  auth_user ||--o{ session : "created_by"
  session ||--o{ meeting_events : "session_id"
  session ||--o{ meeting_participant : "session_id"
  auth_user |o--o{ meeting_participant : "auth_user_id"
  session ||--o{ analysis_event : "session_id"
  session ||--o{ analysis_report : "session_id"
  session ||--o{ session_chat_message : "session_id"
```

---

### 12.5. Логическая модель данных (атрибуты по таблицам)

Краткое описание таблиц PostgreSQL (логический уровень «сущность — атрибуты — ключи»). Источник истины — файлы `code/emeeting-backend/migrations/up/*.sql`.

| Таблица | Назначение | Ключ / важные атрибуты |
|---------|------------|-------------------------|
| **schema_migrations** | учёт применённых миграций | `version` PK |
| **auth_user** | пользователь | `auth_user_id` PK; `email` UK; `password_hash`; `is_active`; защита: `failed_login_attempts`, `locked_until` |
| **refresh_tokens** | refresh JWT | `refresh_token_id` PK; `token_hash` UK; `user_id` → auth_user; `expires_at`, `revoked_at`, ротация `replaced_by_token_hash` |
| **auth_events** | аудит auth | `auth_event_id` PK; `event_type`; `auth_user_id` FK nullable; `ip`, `payload` JSONB |
| **session** | планируемая сессия / встреча | `session_id` PK; `title`, `session_type`, `start_datetime`, `end_datetime`; `created_by` → auth_user; `meeting_status`, `meeting_started_at`, `meeting_ended_at` |
| **meeting_events** | журнал событий митинга | PK; `session_id` FK; `event_type`; `payload` JSONB |
| **meeting_participant** | роль в сессии | PK; `session_id` FK; `auth_user_id` FK nullable (гость); `role_code`; `joined_at`, `left_at`, `is_active` |
| **analysis_event** | событие аналитики (WS) | PK; `session_id` FK; `event_type`, `participant_id`, `trace_id`, `module`, `stage`, `payload` JSONB |
| **analysis_report** | снимок отчёта | PK; `session_id` FK; `stage`, `trace_id`, `report` JSONB, `config_snapshot` JSONB |
| **session_chat_message** | чат встречи | PK; `session_id` FK; `participant_id`, `client_message_id`, `sender_name`, `body` (1…2000 символов) |

**Целостность:** каскадное удаление дочерних записей при удалении `session` для событий митинга, аналитики и чата; `refresh_tokens` и связанные данные — при удалении пользователя (см. `ON DELETE` в SQL).

---

*Файл подготовлен как консолидированная шпаргалка; при изменении кода обновляйте разделы §5–§9, блоки §5A–§5B (теория + библиография) и §12 по актуальным коммитам и миграциям.*
