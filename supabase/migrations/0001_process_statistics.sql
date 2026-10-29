CREATE TABLE processes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, unit text NOT NULL,
 owner text NOT NULL, review_due date NOT NULL, purpose text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE specifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), process_id uuid NOT NULL REFERENCES processes,
 revision integer NOT NULL CHECK(revision>0), lower_limit double precision NOT NULL, upper_limit double precision NOT NULL,
 reason text NOT NULL, actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(process_id,revision), CHECK(lower_limit<upper_limit),
 CHECK(lower_limit > '-Infinity'::float8 AND upper_limit < 'Infinity'::float8)
);
CREATE TABLE series (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), process_id uuid NOT NULL REFERENCES processes,
 name text NOT NULL, source_sha text NOT NULL, map_sha text NOT NULL, source_name text NOT NULL,
 mapping jsonb NOT NULL, actor text NOT NULL, review_due date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(process_id,source_sha,map_sha)
);
CREATE TABLE measurements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), series_id uuid NOT NULL REFERENCES series,
 row_number integer NOT NULL CHECK(row_number>0), measured_at timestamptz NOT NULL, value double precision,
 batch text NOT NULL DEFAULT '', raw jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(series_id,row_number), CHECK(value IS NULL OR (value > '-Infinity'::float8 AND value < 'Infinity'::float8))
);
CREATE TABLE analyses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), series_id uuid NOT NULL REFERENCES series,
 method text NOT NULL CHECK(method IN ('describe','individuals','capability')),
 specification_id uuid REFERENCES specifications, baseline_id uuid REFERENCES analyses,
 input_sha text NOT NULL, result jsonb NOT NULL, actor text NOT NULL, evidence text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), series_id uuid NOT NULL REFERENCES series,
 title text NOT NULL, owner text NOT NULL, due date NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 resolution text, actor text NOT NULL, closed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((status='open' AND closed_at IS NULL) OR (status='closed' AND closed_at IS NOT NULL AND length(resolution)>0))
);
CREATE TABLE notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), series_id uuid NOT NULL REFERENCES series, body text NOT NULL, actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation text NOT NULL, record_id uuid NOT NULL, actor text NOT NULL, detail jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['processes','specifications','series','measurements','analyses','actions','notes','audit_events'] LOOP
 EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',tab);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',tab);
 END LOOP;
END $$;
CREATE VIEW v_current_specs AS SELECT DISTINCT ON(process_id) * FROM specifications ORDER BY process_id,revision DESC;
CREATE VIEW v_series AS
 SELECT s.id,s.name,p.name AS process,p.unit,s.review_due,count(m.id)::integer AS rows,
 count(m.value)::integer AS valid,count(m.id) FILTER(WHERE m.value IS NULL)::integer AS missing,
 min(m.measured_at) AS first_measurement,max(m.measured_at) AS last_measurement,
 round(avg(m.value)::numeric,6) AS mean,round(stddev_samp(m.value)::numeric,6) AS sample_sd
 FROM series s JOIN processes p ON p.id=s.process_id LEFT JOIN measurements m ON m.series_id=s.id GROUP BY s.id,p.id;
CREATE VIEW v_attention AS
 SELECT 'overdue investigation' AS finding,a.id,a.title AS record,a.owner,a.due AS due FROM actions a WHERE status='open' AND due<current_date
 UNION ALL SELECT 'process review due',id,name,owner,review_due FROM processes WHERE review_due<current_date
 UNION ALL SELECT 'data review due',s.id,s.name,p.owner,s.review_due FROM series s JOIN processes p ON p.id=s.process_id WHERE s.review_due<current_date;
CREATE VIEW v_compliance AS
 SELECT 'missing measurements' AS finding,id,name AS record,'Review missing values before analysis'::text AS action FROM v_series WHERE missing>0
 UNION ALL SELECT 'insufficient observations',id,name,'Collect at least two valid values for sample variation' FROM v_series WHERE valid<2
 UNION ALL SELECT 'no specifications',p.id,p.name,'Record approved limits before capability analysis' FROM processes p WHERE NOT EXISTS(SELECT 1 FROM specifications x WHERE x.process_id=p.id)
 UNION ALL SELECT 'retention review',s.id,s.name,'Review continued need for source rows and operator names' FROM series s WHERE review_due<current_date
 UNION ALL SELECT 'unreviewed analysis',s.id,s.name,'Record an analysis and its interpretation' FROM series s WHERE NOT EXISTS(SELECT 1 FROM analyses a WHERE a.series_id=s.id);
CREATE VIEW v_week AS SELECT p.name AS process,p.owner,
 (SELECT count(*) FROM series s WHERE s.process_id=p.id)::integer AS series,
 (SELECT count(*) FROM actions a JOIN series s ON s.id=a.series_id WHERE s.process_id=p.id AND a.status='open')::integer AS open_actions,
 (SELECT count(*) FROM analyses a JOIN series s ON s.id=a.series_id WHERE s.process_id=p.id)::integer AS saved_analyses,p.review_due FROM processes p;
