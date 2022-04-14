#if !EDITIONS
#define EDITIONS

#include "fa2_interface.mligo"
#include "fa2_operator_lib.mligo"
#include "fa2_multi_nft_manager.mligo"

#include "admin.mligo"
#include "fa2_multi_nft_asset.mligo"

type edition_id = nat

type mint_edition_run =
[@layout:comb]
{
  ipfs_hash : bytes;
  royalties_percentage: nat;
  royalties_address: address;
  total_edition_number : nat;
}

type distribute_edition =
[@layout:comb]
{
  edition_id : edition_id;
  receivers : address list;
}

type editions_entrypoints =
 | FA2 of nft_asset_entrypoints
 | Mint_editions of mint_edition_run list
 | Distribute_editions of distribute_edition list
 | Burn_token of token_id


let assert_msg (condition, msg : bool * string ) : unit =
  if (not condition) then failwith(msg) else unit

let fail_if_not_owner (sender, token_id, storage : address * token_id * editions_storage) : unit =
    match (Big_map.find_opt token_id storage.assets.ledger) with
    | None -> (failwith fa2_token_undefined : unit)
    | Some cur_o ->
      if cur_o = sender
      then unit
      else (failwith fa2_insufficient_balance : unit)

[@inline]
let token_id_to_edition_id (token_id, storage : token_id * editions_storage) : edition_id =
   (token_id/storage.max_editions_per_run)

let mint_editions ( edition_run_list , storage : mint_edition_run list * editions_storage)
  : operation list * editions_storage =
  let mint_single_edition_run : (editions_storage * mint_edition_run) -> editions_storage =
    fun (storage, param : editions_storage * mint_edition_run) ->
      let u : unit = assert_msg(param.royalties_percentage <= 100n,
        "ROYALTIES_CANT_EXCEED_100_PERCENT"
      ) in
      let u : unit = assert_msg(param.total_edition_number >= 1n,
        "EDITION_NUMBER_SHOULD_BE_AT_LEAST_ONE"
      ) in
      let u : unit = assert_msg(param.total_edition_number <= storage.max_editions_per_run,
         "EDITION_RUN_TOO_LARGE" ) in
      let edition_metadata : edition_metadata = {
        creator = Tezos.sender;
        ipfs_hash = param.ipfs_hash;
        royalties_percentage = param.royalties_percentage;
        royalties_address = param.royalties_address;
        total_edition_number = param.total_edition_number;
        remaining_edition_number = param.total_edition_number;
      } in
      let new_editions_metadata = Big_map.add storage.next_edition_id edition_metadata storage.editions_metadata in
      {storage with
          next_edition_id = storage.next_edition_id + 1n;
          editions_metadata = new_editions_metadata;
      } in
  let new_storage = List.fold mint_single_edition_run edition_run_list storage in
  ([] : operation list), new_storage

let distribute_edition_to_addresses ( edition_id, receivers, edition_metadata, storage : edition_id * (address list) * edition_metadata * editions_storage)
  : editions_storage =
  let distribute_edition_to_address : ((mint_editions_param * token_id) * address) -> (mint_editions_param * token_id) =
    fun ( (mint_editions_param, token_id), to_  : (mint_editions_param * token_id) * address) ->
      let mint_edition_param : mint_edition_param = {
          owner = to_;
          token_id = token_id;
      } in
      ((mint_edition_param :: mint_editions_param) , token_id + 1n)
  in
  let total_edition_number_left_after_distribution : int = edition_metadata.remaining_edition_number - (List.length receivers) in
  let u : unit = assert_msg(total_edition_number_left_after_distribution >= 0, "NO_EDITIONS_TO_DISTRIBUTE" ) in
  let initial_token_id : nat = (edition_id * storage.max_editions_per_run) + abs (edition_metadata.total_edition_number - edition_metadata.remaining_edition_number) in
  let mint_editions_param, _ : mint_editions_param * token_id = (List.fold distribute_edition_to_address receivers (([] : mint_editions_param), initial_token_id)) in
  let new_edition_metadata : edition_metadata = {edition_metadata with remaining_edition_number = abs(total_edition_number_left_after_distribution)} in
  let _ , nft_token_storage = mint_edition_set (mint_editions_param, (edition_id * storage.max_editions_per_run), edition_metadata.ipfs_hash, storage.assets) in
  let new_editions_metadata = Big_map.update edition_id (Some new_edition_metadata) storage.editions_metadata in
  let new_storage = {storage with assets = nft_token_storage; editions_metadata = new_editions_metadata} in
  new_storage

let distribute_editions (distribute_list, storage : distribute_edition list * editions_storage)
  : operation list * editions_storage =
  let distribute_edition : (editions_storage * distribute_edition) -> editions_storage =
    fun (storage, distribute_param : editions_storage * distribute_edition) ->
        let edition_metadata : edition_metadata = (match (Big_map.find_opt distribute_param.edition_id storage.editions_metadata) with
          | Some edition_metadata -> edition_metadata
          | None -> (failwith "INVALID_EDITION_ID" : edition_metadata)) in
        let u : unit = if (Tezos.sender <> edition_metadata.creator)
            then (failwith "INVALID_DISTRIBUTOR" : unit) else () in
        let new_editions_storage = distribute_edition_to_addresses(distribute_param.edition_id, distribute_param.receivers, edition_metadata, storage) in
        new_editions_storage
  in
  let new_storage = List.fold distribute_edition distribute_list storage in
  ([] : operation list), new_storage

let editions_main (param, editions_storage : editions_entrypoints * editions_storage)
    : (operation  list) * editions_storage =
    match param with
    | FA2 nft_asset_entrypoints ->
        let ops, new_storage = nft_asset_main (nft_asset_entrypoints, editions_storage) in
        ops, new_storage
    | Mint_editions mint_param ->
        let u : unit = fail_if_not_minter editions_storage.admin in
        (mint_editions (mint_param, editions_storage))
    | Distribute_editions distribute_param ->
        let u : unit = fail_if_paused editions_storage.admin in
        (distribute_editions (distribute_param, editions_storage))
    | Burn_token token_id ->
      let u : unit = fail_if_not_owner (Tezos.sender, token_id, editions_storage) in
      ([]: operation list), { editions_storage with assets.ledger =  Big_map.remove token_id editions_storage.assets.ledger }

#endif