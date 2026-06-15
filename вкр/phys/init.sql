CREATE TYPE session_type_enum AS ENUM (
    'interview',
    'meeting',
    'assessment',
    'other'
);

CREATE TYPE location_type_enum AS ENUM (
    'online',
    'offline',
    'hybrid'
);

CREATE TYPE data_source_enum AS ENUM (
    'video',
    'audio',
    'multimodal'
);

CREATE TABLE auth_user (
    auth_user_id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE auth_role (
    auth_role_id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE auth_user_role (
    auth_user_id INT REFERENCES auth_user(auth_user_id) ON DELETE CASCADE,
    auth_role_id INT REFERENCES auth_role(auth_role_id),
    PRIMARY KEY (auth_user_id, auth_role_id)
);

CREATE TABLE session_role (
    session_role_id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE emotion_category (
    emotion_category_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE emotion_type (
    emotion_type_id SERIAL PRIMARY KEY,
    emotion_category_id INT REFERENCES emotion_category(emotion_category_id),
    name TEXT NOT NULL,
    detection_threshold NUMERIC(5,2),
    description TEXT
);

CREATE TABLE report_type (
    report_type_id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE person (
    person_id SERIAL PRIMARY KEY,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profile (
    profile_id SERIAL PRIMARY KEY,
    person_id INT NOT NULL REFERENCES person(person_id),
    auth_user_id INT UNIQUE REFERENCES auth_user(auth_user_id),
    employee_number TEXT UNIQUE,
    position TEXT,
    department TEXT,
    hiring_date DATE,
    resume_url TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE session (
    session_id SERIAL PRIMARY KEY,
    session_type session_type_enum NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_datetime TIMESTAMP,
    end_datetime TIMESTAMP,
    location_type location_type_enum,
    physical_location TEXT,
    created_by INT REFERENCES auth_user(auth_user_id)
);

CREATE TABLE session_participant (
    session_participant_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES session(session_id) ON DELETE CASCADE,
    profile_id INT NOT NULL REFERENCES profile(profile_id),
    session_role_id INT REFERENCES session_role(session_role_id),
    join_datetime TIMESTAMP,
    leave_datetime TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    comment TEXT,
    UNIQUE (session_id, profile_id)
);

CREATE TABLE video_stream (
    video_stream_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES session(session_id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    frame_rate NUMERIC(6,2),
    resolution TEXT,
    duration_sec INT,
    codec TEXT,
    recorded_by INT REFERENCES auth_user(auth_user_id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audio_stream (
    audio_stream_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES session(session_id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    sample_rate INT,
    channels INT,
    duration_sec INT,
    codec TEXT,
    recorded_by INT REFERENCES auth_user(auth_user_id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emotion_analysis_config (
    config_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    model_name TEXT NOT NULL,
    analysis_interval_sec INT,
    min_confidence NUMERIC(4,3),
    sensitivity NUMERIC(4,3),
    default_source data_source_enum NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE config_emotion_type (
    config_id INT REFERENCES emotion_analysis_config(config_id) ON DELETE CASCADE,
    emotion_type_id INT REFERENCES emotion_type(emotion_type_id),
    PRIMARY KEY (emotion_type_id, config_id)
);

CREATE TABLE emotion_record (
    emotion_record_id SERIAL PRIMARY KEY,
    session_participant_id INT REFERENCES session_participant(session_participant_id) ON DELETE CASCADE,
    emotion_type_id INT REFERENCES emotion_type(emotion_type_id),
    config_id INT REFERENCES emotion_analysis_config(config_id),
    video_stream_id INT REFERENCES video_stream(video_stream_id),
    audio_stream_id INT REFERENCES audio_stream(audio_stream_id),
    time_start_sec NUMERIC(8,3),
    time_end_sec NUMERIC(8,3),
    intensity INT CHECK (intensity BETWEEN 0 AND 100),
    confidence INT CHECK (confidence BETWEEN 0 AND 100),
    data_source data_source_enum NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE report (
    report_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES session(session_id) ON DELETE CASCADE,
    report_type_id INT REFERENCES report_type(report_type_id),
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    summary_json JSONB,
    participants_json JSONB,
    dashboard_json JSONB
);
