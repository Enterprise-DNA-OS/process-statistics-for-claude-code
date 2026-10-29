INSERT INTO processes(id,name,unit,owner,review_due,purpose) VALUES
 ('10000000-0000-4000-8000-000000000001','Bottle fill','ml','Demo quality lead',current_date-3,'Fictional packaging process review'),
 ('10000000-0000-4000-8000-000000000002','Cap torque','Nm','Demo engineer',current_date+30,'Fictional closure study') ON CONFLICT DO NOTHING;
INSERT INTO specifications(id,process_id,revision,lower_limit,upper_limit,reason,actor) VALUES
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,495,505,'Fictional demonstration limits, not a legal or customer specification','Demo operator') ON CONFLICT DO NOTHING;
INSERT INTO series(id,process_id,name,source_sha,map_sha,source_name,mapping,actor,review_due) VALUES
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Fill baseline','demo-baseline','demo','seed.sql','{}','Demo operator',current_date+30),
 ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Fill week','demo-week','demo','seed.sql','{}','Demo operator',current_date-2),
 ('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','Torque trial','demo-torque','demo','seed.sql','{}','Demo operator',current_date+30) ON CONFLICT DO NOTHING;
INSERT INTO measurements(series_id,row_number,measured_at,value,batch,raw)
 SELECT '30000000-0000-4000-8000-000000000001',i, current_date-14+i*interval '1 hour',500+CASE i%4 WHEN 0 THEN -1 WHEN 1 THEN 0 WHEN 2 THEN 1 ELSE 0 END,'Baseline','{}' FROM generate_series(1,24) i ON CONFLICT DO NOTHING;
INSERT INTO measurements(series_id,row_number,measured_at,value,batch,raw)
 SELECT '30000000-0000-4000-8000-000000000002',i, current_date-2+i*interval '1 hour',CASE WHEN i=8 THEN 512 WHEN i=12 THEN NULL ELSE 500+CASE i%4 WHEN 0 THEN -1 WHEN 1 THEN 0 WHEN 2 THEN 1 ELSE 0 END END,CASE WHEN i<7 THEN 'Shift A' ELSE 'Shift B' END,'{}' FROM generate_series(1,12) i ON CONFLICT DO NOTHING;
INSERT INTO measurements(series_id,row_number,measured_at,value,batch,raw) VALUES ('30000000-0000-4000-8000-000000000003',1,current_date-1,1.4,'Trial','{}') ON CONFLICT DO NOTHING;
INSERT INTO actions(id,series_id,title,owner,due,actor) VALUES ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','Check fill excursion on Shift B','Demo quality lead',current_date-1,'Demo operator') ON CONFLICT DO NOTHING;
INSERT INTO notes(id,series_id,body,actor) VALUES ('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','Fictional demo: review missing row and the fill excursion before interpreting capability.','Demo operator') ON CONFLICT DO NOTHING;
