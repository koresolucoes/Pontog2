-- First verified Belo Horizonte event batch and supporting venues.

insert into public.venues(id,name,type,description,address,lat,lng,opening_hours,is_partner,is_verified,tags,source_type,website,phone,city)
select 'e59c27a8-7998-47df-864b-73739258606a','Pub Major Lock','club','Casa de shows e pub tradicional do Centro de Belo Horizonte, com programação frequente de festas e DJs.','Rua dos Guajajaras, 842 - Centro, Belo Horizonte - MG',null,null,'Seg 22:00-04:00; Ter fechado; Qua-Sáb 22:00-04:00; Dom fechado',false,true,array['casa de shows','pub','Centro','eventos'],'curated_official_2026','https://portalbelohorizonte.com.br/trade/equipamentos-e-servicos/casa-de-show/major-lock','(31) 99957-3757','Belo Horizonte'
where not exists(select 1 from public.venues where lower(name) in ('pub major lock','major lock'));

insert into public.venues(id,name,type,description,address,lat,lng,is_partner,is_verified,tags,source_type,phone,city)
select '5d63e304-9d67-42e7-961a-e3eaf9366faa','Estação Gueto','event','Espaço de eventos no Barro Preto com programação de festas, música, cultura pop e noites LGBTQ+.','Rua Paracatu, 65 A - Barro Preto, Belo Horizonte - MG',null,null,false,true,array['eventos','LGBTQIA+','Barro Preto','18+'],'curated_multi_source_2026','(31) 99428-4229','Belo Horizonte'
where not exists(select 1 from public.venues where lower(name) in ('estação gueto','o gueto'));

insert into public.venues(id,name,type,description,address,lat,lng,is_partner,is_verified,tags,source_type,website,city)
select 'b72420ac-241a-4691-8e49-17bd088e71ec','DOM Multi Eventos','event','Espaço de eventos no Santo Agostinho com duas pistas, shows, DJs e programação diversa.','Avenida Barbacena, 33, 3º andar - Santo Agostinho, Belo Horizonte - MG',null,null,false,true,array['eventos','LGBTQIA+','Santo Agostinho','18+'],'curated_official_2026','https://www.sympla.com.br/evento/lgc/3547645','Belo Horizonte'
where not exists(select 1 from public.venues where lower(name)='dom multi eventos');

insert into public.venues(id,name,type,description,address,lat,lng,is_partner,is_verified,tags,source_type,website,city)
select '89a60434-7042-4487-9670-0d68f35f3920','Viaduto Santa Tereza','culture','Marco cultural de Belo Horizonte e espaço recorrente para festivais, música, cultura urbana e encontros públicos.','Av. Assis Chateaubriand, 619 - Floresta, Belo Horizonte - MG',-19.919868,-43.934247,false,true,array['cultura','eventos','Floresta','espaço público'],'curated_official_2026','https://prefeitura.pbh.gov.br/fundacao-municipal-de-cultura/centro-de-referencia-das-culturas-urbanas-viaduto-santa-tereza','Belo Horizonte'
where not exists(select 1 from public.venues where lower(name)='viaduto santa tereza');

insert into public.events(id,venue_id,title,description,category,start_time,end_time,source_url,source_type,tags,is_public,is_verified,status,organizer_name)
select '6c6c914b-22be-4989-a79e-ea63e03e220f',v.id,'Noite das Minas — Sáfica Club','Noite voltada a mulheres e pessoas trans, com piseiro, sertanejo, funk, DJs e atrações ao vivo.','party','2026-09-12T22:00:00-03:00','2026-09-13T03:40:00-03:00','https://www.sympla.com.br/evento/noite-das-minas-safica-club/3557886','sympla_verified',array['LGBTQIA+','sáfica','mulheres','pessoas trans','18+'],true,true,'scheduled','Noite das Minas'
from public.venues v where lower(v.name)='dom multi eventos'
and not exists(select 1 from public.events where id='6c6c914b-22be-4989-a79e-ea63e03e220f');

insert into public.events(id,venue_id,title,description,category,start_time,end_time,source_url,source_type,tags,is_public,is_verified,status,organizer_name)
select 'bad2c735-51e2-43c5-980f-e9506f45a492',v.id,'LOVEZINHO | Major Lock | 12/09','Edição da festa LOVEZINHO no Major Lock, com DJs, funk, drinks e ativações ao longo da noite.','party','2026-09-12T20:00:00-03:00','2026-09-13T02:00:00-03:00','https://www.sympla.com.br/evento/lgc/3539540','sympla_verified',array['festa','funk','Centro','18+'],true,true,'scheduled','LOVEZINHO'
from public.venues v where lower(v.name)='pub major lock'
and not exists(select 1 from public.events where id='bad2c735-51e2-43c5-980f-e9506f45a492');

insert into public.events(id,venue_id,title,description,category,start_time,end_time,source_url,source_type,tags,is_public,is_verified,status,organizer_name)
select '60645417-6ed4-4971-92c6-42c56b66a139',v.id,'BEAR NIGHT | 19/09 | O GUETO','Primeira edição da Bear Night na capital mineira, com pop nacional e internacional, karaokê, pista e programação voltada à comunidade bear e admiradores.','party','2026-09-19T23:00:00-03:00','2026-09-20T05:00:00-03:00','https://www.sympla.com.br/evento/lgc/3562281','sympla_verified',array['LGBTQIA+','bear','festa','Barro Preto','18+'],true,true,'scheduled','Bear Night'
from public.venues v where lower(v.name)='estação gueto'
and not exists(select 1 from public.events where id='60645417-6ed4-4971-92c6-42c56b66a139');

insert into public.events(id,venue_id,title,description,category,start_time,end_time,source_url,source_type,tags,is_public,is_verified,status,organizer_name)
select '99f63bf5-9673-45cd-81b7-b9516de1882a',v.id,'Festival Pride BH','Festival gratuito dedicado à arte, cultura, diversidade e representatividade, com mais de 30 artistas, música, dança e performances.','festival','2026-09-27T13:30:00-03:00','2026-09-27T22:00:00-03:00','https://portalbelohorizonte.com.br/eventos/festival/lgbt/festival-pride-bh','portal_bh_official',array['LGBTQIA+','gratuito','festival','música','dança','Floresta'],true,true,'scheduled','Festival Pride BH'
from public.venues v where lower(v.name)='viaduto santa tereza'
and not exists(select 1 from public.events where id='99f63bf5-9673-45cd-81b7-b9516de1882a');
