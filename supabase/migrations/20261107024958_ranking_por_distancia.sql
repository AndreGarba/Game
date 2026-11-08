-- Ranking por distância: uma linha por jogador (id anônimo do aparelho), sempre com a partida em
-- que ele foi mais longe. Quem escreve é só a Edge Function registrar-partida (service_role),
-- depois de refazer a partida com o motor. O cliente lê só pela RPC ranking_top.

create table public.ranking (
  jogador_id uuid primary key,
  nome text not null check (char_length(nome) between 1 and 16),
  distancia integer not null check (distancia >= 0),
  pontos integer not null check (pontos >= 0),
  ossos integer not null check (ossos >= 0),
  ossos_ouro integer not null check (ossos_ouro >= 0),
  ticks integer not null check (ticks >= 0),
  -- Seed + log da melhor partida: dá para refazer e auditar qualquer linha do ranking.
  seed bigint not null check (seed between 0 and 4294967295),
  versao_regras text not null,
  log jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index ranking_ordem on public.ranking (distancia desc, pontos desc, atualizado_em asc);

-- Rate limit por IP, em janelas de 1 minuto.
create table public.envios_por_ip (
  ip text not null,
  janela timestamptz not null,
  contagem integer not null default 0,
  primary key (ip, janela)
);

-- RLS ligada e nenhuma política: o cliente não lê nem escreve direto em nenhuma das duas.
alter table public.ranking enable row level security;
alter table public.envios_por_ip enable row level security;
revoke all on public.ranking from anon, authenticated;
revoke all on public.envios_por_ip from anon, authenticated;

-- Leitura pública do ranking, sem expor jogador_id (que é o que permite gravar no lugar de alguém).
create function public.ranking_top(limite integer default 10)
returns table (posicao integer, nome text, distancia integer, pontos integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (row_number() over (order by r.distancia desc, r.pontos desc, r.atualizado_em asc))::integer,
    r.nome,
    r.distancia,
    r.pontos
  from public.ranking r
  order by r.distancia desc, r.pontos desc, r.atualizado_em asc
  limit least(greatest(coalesce(limite, 10), 1), 50);
$$;

revoke all on function public.ranking_top(integer) from public;
grant execute on function public.ranking_top(integer) to anon, authenticated;

-- Grava a partida se ela for a mais longa do jogador (empate em distância: vence mais pontos).
-- O nome é sempre atualizado: é o nome que o jogador quer ver agora.
create function public.registrar_partida(
  p_jogador_id uuid,
  p_nome text,
  p_distancia integer,
  p_pontos integer,
  p_ossos integer,
  p_ossos_ouro integer,
  p_ticks integer,
  p_seed bigint,
  p_versao_regras text,
  p_log jsonb
)
returns table (melhor boolean, distancia integer, posicao integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_melhor boolean;
  v_atual public.ranking%rowtype;
begin
  select * into v_atual from public.ranking r where r.jogador_id = p_jogador_id for update;

  v_melhor := not found
    or p_distancia > v_atual.distancia
    or (p_distancia = v_atual.distancia and p_pontos > v_atual.pontos);

  if v_melhor then
    insert into public.ranking as r (
      jogador_id, nome, distancia, pontos, ossos, ossos_ouro, ticks, seed, versao_regras, log
    ) values (
      p_jogador_id, p_nome, p_distancia, p_pontos, p_ossos, p_ossos_ouro, p_ticks, p_seed,
      p_versao_regras, p_log
    )
    on conflict (jogador_id) do update set
      nome = excluded.nome,
      distancia = excluded.distancia,
      pontos = excluded.pontos,
      ossos = excluded.ossos,
      ossos_ouro = excluded.ossos_ouro,
      ticks = excluded.ticks,
      seed = excluded.seed,
      versao_regras = excluded.versao_regras,
      log = excluded.log,
      atualizado_em = now();
  else
    update public.ranking r set nome = p_nome where r.jogador_id = p_jogador_id;
  end if;

  select * into v_atual from public.ranking r where r.jogador_id = p_jogador_id;

  return query
  select
    v_melhor,
    v_atual.distancia,
    (
      select count(*)::integer + 1
      from public.ranking o
      where o.distancia > v_atual.distancia
        or (o.distancia = v_atual.distancia and o.pontos > v_atual.pontos)
        or (o.distancia = v_atual.distancia and o.pontos = v_atual.pontos
            and o.atualizado_em < v_atual.atualizado_em)
    );
end;
$$;

revoke all on function public.registrar_partida(uuid, text, integer, integer, integer, integer, integer, bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_partida(uuid, text, integer, integer, integer, integer, integer, bigint, text, jsonb) to service_role;

-- Conta um envio do IP na janela do minuto atual. Devolve false quando passou do limite.
create function public.contar_envio_ip(p_ip text, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contagem integer;
begin
  insert into public.envios_por_ip as e (ip, janela, contagem)
  values (p_ip, date_trunc('minute', now()), 1)
  on conflict (ip, janela) do update set contagem = e.contagem + 1
  returning e.contagem into v_contagem;

  -- Limpeza preguiçosa: janelas com mais de 1 hora não servem para mais nada.
  delete from public.envios_por_ip e where e.janela < now() - interval '1 hour';

  return v_contagem <= p_max;
end;
$$;

revoke all on function public.contar_envio_ip(text, integer) from public, anon, authenticated;
grant execute on function public.contar_envio_ip(text, integer) to service_role;
