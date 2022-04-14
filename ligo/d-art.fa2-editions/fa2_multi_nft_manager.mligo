#if !FA2_MULTI_NFT_MINTER

#define FA2_MULTI_NFT_MINTER

#include "fa2_multi_nft_token.mligo"

type minted = {
  storage : nft_token_storage;
  reversed_txs : transfer_destination_descriptor list;
}

type mint_edition_param =
[@layout:comb]
{
  token_id: token_id;
  owner : address;
}

type mint_editions_param = mint_edition_param list

let create_txs_editions (param, first_edition_token_id, ipfs_hash, storage : mint_editions_param * nat * bytes * nft_token_storage)
  : minted =
  let seed1 : minted = {
    storage = storage;
    reversed_txs = ([] : transfer_destination_descriptor list);
  } in
  List.fold
    (fun (acc, t : minted * mint_edition_param) ->
      let new_token_id = t.token_id in
      if (Big_map.mem new_token_id acc.storage.ledger)
      then (failwith "FA2_INVALID_TOKEN_ID" : minted)
      else
        let edition_number: int = new_token_id - first_edition_token_id + 1n in
        let new_token_metadata_map = Map.literal [
          ("", ipfs_hash);
          ("edition_number", Bytes.pack edition_number)
        ] in
        let new_token_metadata =
          Big_map.add new_token_id { token_id = new_token_id; token_info = new_token_metadata_map } acc.storage.token_metadata in

        let new_storage = { acc.storage with
          token_metadata = new_token_metadata;
        } in
        let tx : transfer_destination_descriptor = {
          to_ = Some t.owner;
          token_id = new_token_id;
          amount = 1n;
        } in
        {
          storage = new_storage;
          reversed_txs = tx :: acc.reversed_txs;
        }
    ) param seed1

let mint_edition_set (param, first_edition_token_id, ipfs_hash, storage : mint_editions_param * nat * bytes * nft_token_storage)
    : operation list * nft_token_storage =
  (* update ledger *)
  let mint = create_txs_editions (param, first_edition_token_id, ipfs_hash, storage) in
  let tx_descriptor : transfer_descriptor = {
    from_ = (None : address option);
    txs = mint.reversed_txs;
  } in
  let nop_operator_validator =
    fun (_p : address * address * token_id * operator_storage) -> unit in
  let ops, storage = fa2_transfer ([tx_descriptor], nop_operator_validator, mint.storage) in
  ops, storage
#endif