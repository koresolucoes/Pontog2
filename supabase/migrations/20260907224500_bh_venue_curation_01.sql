-- Belo Horizonte venue curation — 2026-09-07
-- Goals:
-- 1. Quarantine synthetic-looking seed batches without deleting data.
-- 2. Keep/update current venues that have fresh public evidence.
-- 3. Insert only curated places with current, verifiable public information.
--
-- Rollback principle: no rows from the suspicious batches are deleted. Their
-- previous visibility can be restored by setting is_verified=true again.

begin;

-- Three exact 100-row batches were created within seconds, have no submitter,
-- source_type='user' and were all pre-marked verified. Keep them for audit but
-- remove them from product surfaces that require is_verified=true.
update public.venues
set is_verified = false,
    source_type = 'seed_legacy_quarantined'
where submitted_by is null
  and source_type = 'user'
  and created_at in (
    '2026-07-13 19:12:21.266662+00'::timestamptz,
    '2026-07-13 19:12:34.344217+00'::timestamptz,
    '2026-07-13 19:12:41.435988+00'::timestamptz
  );

-- Legacy BH records without sufficient current corroboration are kept, but no
-- longer presented as verified.
update public.venues
set is_verified = false,
    source_type = 'legacy_unverified'
where id in (
  '61a39a44-61bf-4e6c-b4d4-61a87bfad9f9'::uuid, -- Gis Mais
  '8768fe86-0936-4d4a-bf5f-35aa1d25501d'::uuid  -- Sauna Status
);

-- Church House moved/evolved into the current Clube Church. Reuse the existing
-- row to preserve references instead of creating a duplicate. Coordinates are
-- intentionally cleared until a precise current geocode is verified.
update public.venues
set name = 'Clube Church',
    type = 'club',
    description = 'Casa noturna LGBTQ+ com programação de pop, funk, DJs e eventos da diversidade.',
    address = 'Rua dos Inconfidentes, 1141 - Funcionários, Belo Horizonte - MG',
    lat = null,
    lng = null,
    opening_hours = 'Sex-Dom 23:00-05:00',
    website = 'https://www.clubechurch.com.br',
    phone = '(31) 97401-2828',
    city = 'Belo Horizonte',
    street = 'Rua dos Inconfidentes',
    number = '1141',
    tags = array['LGBTQIA+','club','música','dança'],
    source_type = 'curated_web_2026',
    is_verified = true
where id = 'd049e8d5-5fd8-488e-9be7-7fd571bd5675'::uuid;

-- DDuck has fresh 2026 event activity at the same address. Preserve its
-- existing geocode, remove the unverified legacy phone and refresh metadata.
update public.venues
set name = 'DDuck DClub',
    type = 'club',
    description = 'Casa noturna com festas, DJs e programação voltada à diversidade em Belo Horizonte.',
    address = 'Rua Pernambuco, 1316 - Funcionários, Belo Horizonte - MG',
    opening_hours = 'Eventos geralmente 23:00-06:00; confira a programação da casa',
    phone = null,
    city = 'Belo Horizonte',
    street = 'Rua Pernambuco',
    number = '1316',
    tags = array['LGBTQIA+','club','música','dança'],
    source_type = 'curated_web_2026',
    is_verified = true
where id = 'b07e5b0d-27f7-47fe-abc9-55d047c6ce91'::uuid;

-- Helper pattern below is deliberately idempotent: normalized name OR exact
-- address blocks a second insert if this migration is replayed manually.

insert into public.venues (name,type,description,address,lat,lng,opening_hours,is_partner,tags,is_verified,source_type,phone,city,street,number)
select 'Bar da Cácia','bar','Ponto de encontro LGBTQIA+ tradicional de Belo Horizonte, conhecido pelo karaokê, dança e ambiente descontraído.','Rua Rio de Janeiro, 1411 - Lourdes, Belo Horizonte - MG',-19.926802,-43.940712,'Seg-Dom 18:00-04:00; karaokê a partir das 20:00',false,array['LGBTQIA+','bar','karaokê','música'],true,'curated_web_2026','(31) 3222-3260','Belo Horizonte','Rua Rio de Janeiro','1411'
where not exists (select 1 from public.venues where lower(name)=lower('Bar da Cácia') or lower(coalesce(address,''))=lower('Rua Rio de Janeiro, 1411 - Lourdes, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,lat,lng,opening_hours,is_partner,tags,is_verified,source_type,city,street,number)
select 'John John Bar','bar','Bar LGBTQ+ com drinks, música, DJs e área externa na região da Savassi.','Rua Sergipe, 1516 - Funcionários, Belo Horizonte - MG',-19.9397564,-43.9388313,'Qua-Qui 18:00-01:00; Sex 18:00-03:00; Sáb 17:00-03:00; Dom 15:00-01:00',false,array['LGBTQIA+','bar','drinks','música','trans-friendly'],true,'curated_web_2026','Belo Horizonte','Rua Sergipe','1516'
where not exists (select 1 from public.venues where lower(name)=lower('John John Bar') or lower(coalesce(address,''))=lower('Rua Sergipe, 1516 - Funcionários, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,opening_hours,is_partner,tags,is_verified,source_type,phone,contact_email,city,street,number)
select 'O Quinteiro','bar','Bar de quintal na Floresta, com áreas abertas, comida de boteco, coquetelaria e programação cultural diversa.','Rua Salinas, 1008 - Floresta, Belo Horizonte - MG','Qua-Sex 18:00-24:00; Sáb 15:00-01:00; Dom 12:00-18:00',false,array['LGBTQIA+','bar','ar livre','coquetelaria'],true,'curated_web_2026','(31) 99558-1761','adm@quinteiro.com','Belo Horizonte','Rua Salinas','1008'
where not exists (select 1 from public.venues where lower(name)=lower('O Quinteiro') or lower(coalesce(address,''))=lower('Rua Salinas, 1008 - Floresta, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,opening_hours,is_partner,tags,is_verified,source_type,website,contact_email,city,street,number)
select 'Dédalos Bar BH','bar','Espaço 18+ voltado a homens cis e trans, com música, drinks e áreas de convivência.','Rua São Paulo, 1735 - Lourdes, Belo Horizonte - MG','24 horas, todos os dias',false,array['LGBTQIA+','18+','bar','masculino'],true,'curated_web_2026','https://www.dedalosbarbh.com.br','contato@dedalosbarbh.com.br','Belo Horizonte','Rua São Paulo','1735'
where not exists (select 1 from public.venues where lower(name) in (lower('Dédalos Bar BH'),lower('Dédalos Bar')) or lower(coalesce(address,''))=lower('Rua São Paulo, 1735 - Lourdes, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,opening_hours,is_partner,tags,is_verified,source_type,phone,contact_email,city,street,number)
select 'Espaço Yanã','bar','Espaço gerido por mulheres e referência para mulheres e pessoas LGBTQIAP+, com gastronomia mineira, drinks e programação cultural.','Avenida Francisco Sales, 127 - Floresta, Belo Horizonte - MG','Qui mediante reserva; Sex 18:00-24:00; Sáb 16:00-01:00; Dom mediante reserva',false,array['LGBTQIA+','mulheres','bar','gastronomia','cultura'],true,'curated_web_2026','(31) 99640-4916','espacoyana@gmail.com','Belo Horizonte','Avenida Francisco Sales','127'
where not exists (select 1 from public.venues where lower(name)=lower('Espaço Yanã') or lower(coalesce(address,''))=lower('Avenida Francisco Sales, 127 - Floresta, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,opening_hours,is_partner,tags,is_verified,source_type,phone,city,street,number)
select 'Dona Ninguém','bar','Bar independente e cultural em Santa Tereza, com atenção especial às mulheres lésbicas e bissexuais e à comunidade LGBTQIA+.','Rua Hermilo Alves, 142 - Santa Tereza, Belo Horizonte - MG','Seg/Qui/Sex 17:00-24:00; Sáb 14:00-24:00; Dom 12:00-17:00',false,array['LGBTQIA+','mulheres','bar','cultura'],true,'curated_web_2026','(31) 97336-4543','Belo Horizonte','Rua Hermilo Alves','142'
where not exists (select 1 from public.venues where lower(name)=lower('Dona Ninguém') or lower(coalesce(address,''))=lower('Rua Hermilo Alves, 142 - Santa Tereza, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,lat,lng,opening_hours,is_partner,tags,is_verified,source_type,phone,city,street,number)
select 'Arcos Bar e Restaurante','bar','Bar e restaurante no Centro voltado ao público LGBTQIA+, com drinks, porções, música e eventos.','Rua da Bahia, 1144 - Centro, Belo Horizonte - MG',-19.926830,-43.938129,'Ter 18:00-24:00; Qua 16:00-02:00; Qui 16:00-03:00; Sex 15:00-03:00; Sáb 14:00-03:00; Dom 12:00-24:00',false,array['LGBTQIA+','bar','restaurante'],true,'curated_web_2026','(31) 98441-1161 / (31) 98337-2976','Belo Horizonte','Rua da Bahia','1144'
where not exists (select 1 from public.venues where lower(name)=lower('Arcos Bar e Restaurante') or lower(coalesce(address,''))=lower('Rua da Bahia, 1144 - Centro, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,lat,lng,opening_hours,is_partner,tags,is_verified,source_type,phone,city,street,number)
select 'Bar da Gabi','bar','Drinqueria artesanal em Santa Tereza, com quintal, comida e ambiente acolhedor para a comunidade LGBTQIA+.','Rua Silvianópolis, 197 - Santa Tereza, Belo Horizonte - MG',-19.9130,-43.9107,'Sex 19:00-24:00; Sáb 13:00-21:00',false,array['LGBTQIA+','bar','drinks','ar livre'],true,'curated_web_2026','(31) 98885-6525','Belo Horizonte','Rua Silvianópolis','197'
where not exists (select 1 from public.venues where lower(name)=lower('Bar da Gabi') or lower(coalesce(address,''))=lower('Rua Silvianópolis, 197 - Santa Tereza, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,lat,lng,opening_hours,is_partner,tags,is_verified,source_type,phone,city,street,number)
select 'Mi Corazón','bar','Bar-balada latino na Rua Sapucaí, com drinks, petiscos, DJs, pista e área externa.','Rua Sapucaí, 511 - Floresta, Belo Horizonte - MG',-19.9182454,-43.9327855,'Ter 16:00-23:00; Qua-Qui 16:00-01:00; Sex-Sáb 14:00-02:00; Dom 14:00-22:00',false,array['LGBTQIA+','bar','dança','música','drinks'],true,'curated_web_2026','(31) 98897-7150','Belo Horizonte','Rua Sapucaí','511'
where not exists (select 1 from public.venues where lower(name)=lower('Mi Corazón') or lower(coalesce(address,''))=lower('Rua Sapucaí, 511 - Floresta, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,opening_hours,is_partner,tags,is_verified,source_type,city,street,number)
select 'Borda Bar','bar','Ponto de encontro LGBTQIAPN+ na Floresta, com drinks, petiscos, DJs e programação cultural.','Avenida Assis Chateaubriand, 351 - Floresta, Belo Horizonte - MG','Qua-Qui 18:00-24:00; Sex 18:00-01:00; Sáb 17:00-01:00; Dom 15:00-21:00',false,array['LGBTQIA+','bar','drinks','DJs','cultura'],true,'curated_web_2026','Belo Horizonte','Avenida Assis Chateaubriand','351'
where not exists (select 1 from public.venues where lower(name)=lower('Borda Bar') or lower(coalesce(address,''))=lower('Avenida Assis Chateaubriand, 351 - Floresta, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,lat,lng,opening_hours,is_partner,tags,is_verified,source_type,phone,city,street,number)
select 'Ofélia','bar','Bar e restaurante com proposta temática e ambiente diverso, gerido por pessoas LGBTQIAPN+.','Rua Rio Grande do Norte, 311 - Santa Efigênia, Belo Horizonte - MG',-19.928176,-43.929868,'Ter-Qui 18:00-24:00; Sex 18:00-01:00; Sáb 12:00-01:00; Dom 12:00-20:00',false,array['LGBTQIA+','bar','restaurante','drinks'],true,'curated_web_2026','(31) 98373-4990','Belo Horizonte','Rua Rio Grande do Norte','311'
where not exists (select 1 from public.venues where lower(name)=lower('Ofélia') or lower(coalesce(address,''))=lower('Rua Rio Grande do Norte, 311 - Santa Efigênia, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,lat,lng,opening_hours,is_partner,tags,is_verified,source_type,city,street,number)
select 'Zoom Cruising Bar','cruising','Espaço masculino 18+ voltado ao público LGBTQIAPN+, com bar, dança e áreas de convivência.','Avenida Getúlio Vargas, 1635 - Funcionários, Belo Horizonte - MG',-19.9372,-43.9341,'Qui-Sáb 23:00-05:00; Dom 20:00-05:00',false,array['LGBTQIA+','18+','cruising','masculino'],true,'curated_web_2026','Belo Horizonte','Avenida Getúlio Vargas','1635'
where not exists (select 1 from public.venues where lower(name)=lower('Zoom Cruising Bar') or lower(coalesce(address,''))=lower('Avenida Getúlio Vargas, 1635 - Funcionários, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,lat,lng,opening_hours,is_partner,tags,is_verified,source_type,phone,city,street,number)
select 'Sauna Olimpo BH','sauna','Sauna e espaço de convivência voltado ao público gay em Belo Horizonte.','Rua dos Timbiras, 2635 - Santo Agostinho, Belo Horizonte - MG',-19.9247,-43.9477,'Qua-Dom 15:00-23:00',false,array['LGBTQIA+','sauna','gay','18+'],true,'curated_web_2026','(31) 3335-4188','Belo Horizonte','Rua dos Timbiras','2635'
where not exists (select 1 from public.venues where lower(name) in (lower('Sauna Olimpo BH'),lower('Sauna Olimpo')) or lower(coalesce(address,''))=lower('Rua dos Timbiras, 2635 - Santo Agostinho, Belo Horizonte - MG'));

insert into public.venues (name,type,description,address,lat,lng,opening_hours,is_partner,tags,is_verified,source_type,phone,city,street,number)
select 'Sauna 1097','sauna','Sauna masculina no Centro de Belo Horizonte.','Rua dos Guajajaras, 1097 - Centro, Belo Horizonte - MG',-19.9243577,-43.9445225,'Seg/Qua/Qui 15:00-22:00; Sex 15:00-24:00; Sáb 15:00-01:00; Dom 15:00-22:00',false,array['LGBTQIA+','sauna','gay','18+'],true,'curated_web_2026','(31) 3292-6778','Belo Horizonte','Rua dos Guajajaras','1097'
where not exists (select 1 from public.venues where lower(name)=lower('Sauna 1097') or lower(coalesce(address,''))=lower('Rua dos Guajajaras, 1097 - Centro, Belo Horizonte - MG'));

commit;
