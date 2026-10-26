-- schema.sql চালানোর পর এটা চালাও
insert into organizations (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Demo Group (synthetic)')
on conflict do nothing;

insert into factories (id, org_id, name, location, is_demo) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Demo Knit Factory', 'Gazipur', true)
on conflict do nothing;
