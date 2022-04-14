
#include "fa2_multi_nft_token.mligo"
#include "fa2_multi_nft_manager.mligo"


type edition_metadata =
[@layout:comb]
{
    creator : address;
    ipfs_hash: bytes;
    total_edition_number: nat;
    remaining_edition_number: nat;
    royalties_address: address;
    royalties_percentage: nat;
}

type editions_metadata = (nat, edition_metadata) big_map

type editions_storage =
{
    next_edition_id : nat;
    max_editions_per_run : nat;
    editions_metadata : editions_metadata;
    assets : nft_token_storage;
    admin : admin_storage;
    metadata: (string, bytes) big_map;
}

type nft_asset_entrypoints =
  | Assets of fa2_entry_points
  | Admin of admin_entrypoints

let nft_asset_main (param, storage : nft_asset_entrypoints * editions_storage)
    : operation list * editions_storage =
  match param with
  | Assets fa2 ->
    let u = fail_if_paused(storage.admin) in
    let ops, new_assets = fa2_main (fa2, storage.assets) in
    let new_storage = { storage with assets = new_assets; } in
    ops, new_storage

  | Admin a ->
    let ops, admin = admin_main (a, storage.admin) in
    let new_storage = { storage with admin = admin; } in
    ops, new_storage